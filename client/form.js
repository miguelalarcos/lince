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
        afterSave: () => null,
        save: (evt) => {
            self.enabled = false
            let id = self.doc.get('id')
            let doc = self.doc.toJS()
            if(id) {
                doc = self.beforeUpdate(doc)
                self.dispatcher.ask('rpc', 'update', self.collection, id, doc).then(()=>{
                    self.enabled=true
                    self.afterSave()
                })
            }else{
                doc = self.beforeAdd(doc)
                self.dispatcher.ask('rpc', 'add', self.collection, doc).then((id)=>{
                    self.doc.set('id', id)
                    self.enabled = true
                    self.afterSave()
                })
            }
        },
        clear: ()=>{
            for(let attr of self.attrs){
                self.doc.set(attr, null)
            }
        },
        initForm: (attrs, validation)=>{
            self.attrs = attrs
            self.enabled = false
            self.validFlags = {}

            self.doc = observable(asMap())
            self.doc.observe((ch)=>{
                console.log('ch', ch)
                self.dirty=true
                let name = ch.name
                let msg = validation[name](ch.newValue)
                if(msg == ''){
                    self.validFlags[name] = true
                }
                else{
                    self.validFlags[name] = false
                }
                self['error_message_' + name] = msg
                self.enabled = _.every(self.validFlags, (val) => val)
                self.update()
            })
            self.clear()
            self.opts.rv.observe((ch)=>{
                if(self.dirty){
                    self.opts.rv.set(self.id)
                }
                else{
                    let doc
                    self.id = ch.newValue
                    if(self.id == null){
                        doc = {}
                    }
                    else {
                        doc = self.store.collections[self.store.subsId[self.opts.predicateid]].get(self.id) || {}
                    }
                    self.clear()
                    self.dirty = false
                    for (let key of Object.keys(doc)) {
                        self.doc.set(key, doc[key])
                    }
                }
            })
        }
    }
}