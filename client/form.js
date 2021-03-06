import {observable, asMap, autorun} from 'mobx'
import {ui} from './uiActor'
import _ from 'lodash'

export const FormMixin = (self) => {
    return {
        dispatcher: ui.dispatcher,
        store: ui.store,
        enabled: false,
        dirty: false,
        id: null,
        beforeAdd: (doc) => doc,
        beforeUpdate: (doc) => doc,
        //afterSave: () => null,
        save: (evt) => {
            self.enabled = false
            self.dirty = false
            let id = self.doc.get('id')
            let doc = self.doc.toJS()
            if(id) {
                doc = self.beforeUpdate(doc)
                return self.dispatcher.ask('rpc', 'update', self.collection, id, doc).then(()=>{
                    self.enabled=true
                    //self.afterSave()
                    return null
                    //self.update()
                })
            }else{
                doc = self.beforeAdd(doc)
                return self.dispatcher.ask('rpc', 'add', self.collection, doc).then((id)=>{
                    self.doc.set('id', id)
                    self.dirty = false
                    self.enabled = true
                    //self.afterSave()
                    return id
                    //self.update()
                })
            }
            //self.clear()
        },
        clear: ()=>{
            self.doc.set('id', null)
            for(let attr of self.attrs){
                self.doc.set(attr, null)
            self.dirty = false
            }
        },
        initForm: (collection, attrs, validation)=>{
            self.collection = collection
            self.attrs = attrs
            self.enabled = false
            self.validFlags = {}

            self.doc = observable(asMap())
            self.doc.observe((ch)=>{
                console.log('ch', ch)
                self.dirty=true
                console.log('dirty true')
                let name = ch.name
                let msg = validation[name](ch.newValue)

                if(msg == ''){
                    self.validFlags[name] = true
                }
                else{
                    self.validFlags[name] = false
                }
                self['error_message_' + name] = msg
                //self.enabled = _.every(self.validFlags, (val) => val)
                self.enabled = true
                console.log(self.validFlags)
                self.update()
            })
            self.clear()
            self.opts.rv.observe((ch)=>{
                console.log('llegamos')
                self.id = ch
                if(self.dirty){
                    self.opts.rv.set(self.id)
                    console.log('retornamos por dirty')
                }
                else{
                    let doc
                    if(self.id == null || self.id == undefined){
                        console.log('null or undefined')
                        doc = {}
                    }
                    else {
                        doc = self.store.collections[self.store.subsId[self.opts.predicateid]].get(self.id) || {}
                        console.log('otra rama', doc)
                    }
                    self.clear()
                    self.dirty = false
                    //self.enabled = true
                    for (let key of Object.keys(doc)) {
                        self.doc.set(key, doc[key])
                    }
                }
            })
        }
    }
}