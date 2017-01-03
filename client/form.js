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
                    self.dirty = false
                    return null
                    //self.update()
                })
            }else{
                doc = self.beforeAdd(doc)
                return self.dispatcher.ask('rpc', 'add', self.collection, doc).then((id)=>{
                    self.doc.set('id', id)
                    self.opts.rv.set(id)
                    self.dirty = false
                    self.enabled = true
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
                self.dirty=true
                let name = ch.name
                if(validation[name]) {
                    let msg = validation[name](ch.newValue)

                    if (msg == '') {
                        self.validFlags[name] = true
                    }
                    else {
                        self.validFlags[name] = false
                    }
                    self['error_message_' + name] = msg
                }
                else{
                    self.validFlags[name] = true
                }
                //self.enabled = true
                self.enabled = _.every(self.validFlags)
                self.update()
            })
            self.clear()
            self.opts.rv.observe((ch)=>{
                self.id = ch
                if(self.dirty){
                    self.opts.rv.set(self.id)
                }
                else{
                    let doc
                    if(self.id == null || self.id == undefined){
                        doc = {}
                    }
                    else {
                        doc = self.store.collections[self.store.subsId[self.opts.predicateid]].get(self.id) || {}
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