import _ from 'lodash'
import mbox from 'mobx'

class uiActor{
  constructor(){
    this.dispatcher = null
    this.store = null
  }
}

export const ui = new uiActor()

export const LinkMixin = (self) => {
    return {
        link: (rv, uidest, trans=(x)=>x) =>{
            self[uidest] = trans(rv.get())
            self.update()
            mobx.observe(rv, (v) => {
                self[uidest] = trans(v)
                self.update()
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
      /*
      let t = self.mapIdTicket[id]
      if(t){
          self.dispose[t]()
          delete self.dispose[t]
          console.log('dispose de ticket', t)
      }
      */
      ui.store.ask('subscribe', id, predicate, args).then(({ticket, collection})=>{
          self.mapIdTicket[id] = ticket
          console.log('es ready?', ticket, ui.store.metadata.get(ticket))
          if(ui.store.metadata.get(ticket) == 'ready'){
              self.handle(ticket, collection)
          }
          else{
              console.log('observamos ready', ticket)
              const dispose = ui.store.metadata.observe((change) => {
                  // if(change.newValue == 'initializing'){self.items = []} else
                  if(change.name == ticket && change.newValue == 'ready'){
                      self.handle(ticket, collection)
                      dispose()
                  }
              })
          }
      })
    },
    handle: (ticket, collection) => {
      console.log('ui actor handle', ticket)
      self.items = collection.values() //.filter((x)=> _.includes([...x.tickets], ticket))
      self.update()
      //self.dispose[ticket] =
      collection.observe((change) => {
        console.log('change al observar la collection', change)
        /*
        let tickets
        if(change.newValue && !change.oldValue){
            console.log('add')
            tickets = change.newValue.tickets
        }
        else if(!change.newValue && change.oldValue){
            console.log('delete')
            tickets = change.oldValue.tickets
        }
        else{
            console.log('update/delete')
            tickets = new Set([...change.newValue.tickets, ...change.oldValue.tickets])
        }
        */
        //console.log('handle:', tickets, ticket)
        //if(_.includes([...tickets], ticket)){
        console.log('vamos a llamar a updateitems con change', change)
        self.updateItems(change)
        self.update()
        //}
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
