import mbox from 'mobx'
import {status, ready} from './status'
import {T} from './Ticket'
import {localStorageGetPending} from '../lib/localStorageUtil'

class uiActor{
  constructor(){
    this.dispatcher = null
    this.store = null
  }
}

export const ui = new uiActor()

export const LoginMixin = (self) => {
    return {
        login: (name) => {
            let pending = localStorageGetPending()
            let ticket = pending.length > 0 ? null: 0
            ui.dispatcher.ask('rpc', 'login', name, ticket).then((response)=>{
                status.set('logged')
            })
        }
    }
}

export const LinkMixin = (self) => {
    return {
        link: (rv, uidest, trans=(x)=>x) =>{
            self[uidest] = trans(rv.get())
            self.update()
            mobx.observe(rv, (v) => {
                self[uidest] = trans(v)
                self.update()
            })
        },
        linkMap: (rm, name, uidest, trans=(x)=>x) => {
            self[uidest] = trans(rm.get(name))
            self.update()
            mobx.observe(rm, (ch) => {
                if(ch.name == name) {
                    self[uidest] = trans(ch.newValue)
                    self.update()
                }
            })
        }
    }
}

export const UImixin = (self) => {
  return {
    store: ui.store,
    dispatcher: ui.dispatcher,
    dispose: {},
    mapIdTicket: {},
    subscribeDoc: (collection, rv) => {
      mbox.autorun(()=>{
          self.id = rv.get()
          self.doc = ui.store.collections[collection].get(self.id)
          self.update()
      })
      ui.store.collections[collection].observe((ch)=>{
          if(ch.newValue.id == self.id){
              self.doc = ch.newValue
              self.update()
          }
      })
    },
    subscribe: (id, predicate, args) => {
      ui.store.ask('subscribe', id, predicate, args).then(({ticket, collection}) => {
          console.log('subscribePredicate', id, predicate, args, ready.get())
          ready.get()
          self.mapIdTicket[id] = ticket
          if (ui.store.metadata.get(ticket) == 'ready') {
              self.handle(ticket, collection)
          }
          else {
              const dispose = ui.store.metadata.observe((change) => {
                  // if(change.newValue == 'initializing'){self.items = []} else
                  if (change.name == ticket && change.newValue == 'ready') {
                      self.handle(ticket, collection)
                      dispose()
                  }
              })
          }
      })
    },
    handle: (ticket, collection) => {
      self.items = collection.values() //.filter((x)=> _.includes([...x.tickets], ticket))
      self.update()
      //self.dispose[ticket] =
      collection.observe((change) => { // TODO: no estoy haciendo disponse
        self.updateItems(change)
        self.update()
      })
    },
    updateItems(change){
        let doc, pos
        switch (change.type) {
            case 'add':
                doc = change.newValue
                pos = self.index(doc)
                self.items.splice(pos, 0, doc)
                break;
            case 'update':
                doc = change.newValue
                pos = self.actualIndex(doc)
                self.items.splice(pos, 1)
                pos = self.index(doc)
                self.items.splice(pos, 0, doc)
                break;
            case 'delete':
                doc = change.oldValue
                pos = self.actualIndex(doc)
                self.items.splice(pos, 1)
                break;
        }

    },
    actualIndex: (doc) => {
        let i = 0
        for(let elem of self.items){
            if(doc.id == elem.id)
                return i
            i++
        }
    },
    index: (doc) => {
        let i = 0
        for(let elem of self.items){
            let v = self.sortCmp(doc, elem)
            if(v == 1){
                return i
            }
            i++
        }
        return self.items.length
    },
  }
}
