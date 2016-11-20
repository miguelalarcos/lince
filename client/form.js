import {observable, asMap, autorun} from 'mobx'
import {ui} from './uiActor'

export const FormMixin = (self) => {
    return {
        dispatcher: ui.dispatcher,
        store: ui.store,
        dirty: false,
        id: null,
        save: (evt) => {
            let id = self.doc.get('id')
            if(id) {
                self.dispatcher.ask('rpc', 'update', self.collection, id, self.doc)
            }else{
                self.dispatcher.ask('rpc', 'add', self.collection, self.doc).then((id)=>self.doc.set('id', id))
            }
        },
        initForm: ()=>{
            self.doc = observable(asMap())
            self.doc.observe((ch)=>self.dirty=true)

            self.opts.rv.observe((ch)=>{
                if(self.dirty){
                    self.opts.rv.set(self.id)
                }
                else{
                    self.id = ch.newValue
                    let doc = self.store.collections[self.store.subsId[self.opts.predicateid]].get(self.id) || {}
                    self.doc.clear()
                    self.dirty = false
                    for (let key of Object.keys(doc)) {
                        self.doc.set(key, doc[key])
                    }
                }
            })
        }
    }
}