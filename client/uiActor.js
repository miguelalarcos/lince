import _ from 'lodash'
import mbox from 'mobx'

class uiActor{
  constructor(){
    this.dispatcher = null
    this.store = null
  }
}

export const ui = new uiActor()

export const UImixin = (self) => {
  return {
    store: ui.store,
    dispatcher: ui.dispatcher,
    link: (rv, uidest) =>{
        self[uidest] = rv.get()
        self.update()
        mobx.observe(rv, (v) => {
            self[uidest] = v
            self.update()
        })
    },
    subscribeDoc: (collection, rv) => {
      let id = rv.get()
      self.doc = ui.store.collections[collection].get(id)

      rv.observe((id)=> {
          self.doc = ui.store.collections[collection].get(id)
          ui.store.collections[collection].observe((change) => {
              if (change.newValue.id == id) {
                  self.doc = change.newValue
              }
          })
      })
    },
    subscribePredicate: (id, predicate, args) => {
      let ticket = self.mapIdTicket[id]
      if(ticket) {
          ui.store.unsubscribe(ticket)
      }
      let {ticket, collection} = ui.store.subscribe(predicate, args)
      self.mapIdTicket[id] = ticket
      if(ui.store.metadata[ticket] == 'ready'){
        self.handle(ticket, collection)
      }
      else{
        const dispose = ui.store.metadata.observe((change) => {
          // if(change.newValue == 'initializing'){self.items = []} else
          if(change.name == ticket && change.newValue == 'ready'){
            self.handle(ticket, collection)
            dispose()
          }
        })
      }
    },
    handle: (ticket, collection) => {
      self.items = collection.values().filter((x)=> _.includes([...x.tickets], ticket))
        self.update()
      collection.observe((change) => {
        let tickets = change.newValue && change.newValue.tickets || change.oldValue.tickets
        if(_.includes([...tickets], ticket)){
            self.updateItems(change)
            self.update()
        }
      })
    },
    updateItems(change){
        let doc, pos
        switch (change.type) {
            case 'add':
                doc = change.newValue
                pos = self.index(doc)
                self.items.splice(pos, 0, doc)
                // self.update() ?
                break;
            case 'update':
                doc = change.newValue
                pos = self.actualIndex(doc)
                self.items.splice(pos, 1)
                pos = self.index(doc)
                self.items.splice(pos, 0, doc)
                self.update()
                break;
            case 'delete':
                doc = change.oldValue
                pos = self.actualIndex(doc)
                self.items.splice(pos, 1)
                // self.update() ?
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
