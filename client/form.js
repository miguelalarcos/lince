import {observable, asMap} from 'mobx'
import {ui} from './uiActor'

export const FormMixin = (self) => {
    return {
        dispatcher: ui.dispatcher,
        save: (evt) => {
            let id = self.doc.get('id')
            if(id) {
                self.dispatcher.ask('rpc', 'update', self.collection, id, self.doc)
            }else{
                self.dispatcher.ask('rpc', 'add', self.collection, self.doc).then((id)=>self.doc.set('id', id))
            }
        }
    }
}