import {observable, asMap, asReference} from 'mobx'
import {T} from './Ticket.js'
import _ from 'lodash'
// import {Actor} from './Actor.js'
import Actor from '../lib/Actor.js'

class DataBase{
    constructor(){
        this.collections = {}
    }
    add(collection, key, value){
        console.log('-->', this.collections, collection, key, value)
        if(collection in this.collections){
            let collection_ = this.collections[collection]
            if(key in collection_) {
                let count = collection_[key].__count + 1
                value.__count = count
                //collections[key] = value
                this.collections[collection][key] = value
            }else{
                value.__count = 1
                this.collections[collection][key] = value // = {[key]: value}
            }
        }
        else{
            value.__count = 1
            this.collections[collection] = {[key]: value}
        }
    }
    delete(collection, key){
        console.log('-->', this.collections, collection, key)
        let data = this.collections[collection][key]
        data.__count -= 1
        if(data.__count == 0){
            delete this.collections[collection][key]
        }
    }
    get(collection, key){
        return this.collections[collection][key]
    }
}

class collectionStoreActor extends Actor{
    constructor() {
        super()
        this.ws = null
        this.collections = {}
        this.metadata = observable(asMap())
        this.predicates = {}
        this.filters = {}
        this.ticketsCollection = {}
        this.promises = {}
        this.subsId = {}
        this.registered = {}
        this.activeTickets = new Set()
        this.dataBase = new DataBase()
    }

    getTicketForPredicate(predicate, args={}){
        let pred = this.predicates[predicate]
        if(pred){
            for(let p of pred){
                if(_.isEqual(args, p.args)){
                    return p.ticket
                }else{
                    let t = T.getTicket()
                    this.predicates[name].push({ticket: t, args: args})
                    return t
                }
            }
        }
        else{
            let t = T.getTicket()
            this.predicates[predicate] = [{ticket: t, args: args}]
            return t
        }
    }

    disconnectedNotify(collection, data){
        let old = data.id && this.collections[collection].get(data.id) || null
        let tickets = Object.keys(this.ticketsCollection)
        tickets = _.filter(tickets, (x) => this.ticketsCollection[x] == collection)
        for(let ticket of tickets){
            let filter = this.filters[ticket]
            if(filter(data)){
                if(old && filter(old)) {
                    this.notify({type: 'update', data, ticket}, false)
                }else{
                    this.notify({type: 'add', data, ticket}, false)
                }
            }else if(old && filter(old)){
                this.notify({type: 'delete', data, ticket}, false)
            }
        }
    }

    subscribe(promise, filter, id, predicate, ...args){
        if(this.ws.connected.get()) {
            let ticket = T.getTicket(predicate, args)
            this.filters[ticket] = filter(...args)
            this.ticketsCollection[ticket] = this.registered[predicate]
            if (!this.collections[ticket]) {
                this.collections[ticket] = observable(asMap([], asReference))
            }
            this.activeTickets.add(ticket)
            //let name = this.registered[predicate]
            let collection = this.collections[ticket]
            promise.resolve({ticket, collection})
            if (this.subsId[id]) {
                delete this.collections[this.subsId[id]]
                this.ws.tell('send', 'unsubscribe', [], this.subsId[id])
                this.activeTickets.delete(this.subsId[id])
            }
            this.subsId[id] = ticket
            args.unshift(predicate)
            this.ws.tell('send', 'subscribe', args, ticket)
        }else{
            let collections = Object.keys(this.dataBase)
            for(let collection of collections){
                let keys = Object.keys(this.dataBase[collection])
                for(key of keys){
                    let data = this.dataBase.get(collection, key)
                    this.disconnectedNotify(collection, data)
                }
            }
        }
    }

    register(predicate, collection){
        this.registered[predicate] = collection
    }

    getCollection(predicate){
        return this.registered[predicate] || predicate
    }

    clear(collection){
        this.collections[collection].clear()
    }

    clearTicket(){
        ticket = 1
    }

    notify(msg, cache=true){
        let collection = this.registered[msg.predicate]
        if(!_.includes([...this.activeTickets], msg.ticket)){
            return
        }
        switch(msg.type){
            case 'initializing':
                this.metadata.set(''+msg.ticket, 'initializing')
                break
            case 'ready':
                this.metadata.set(''+msg.ticket, 'ready')
                break
            case 'add':
                this.add(msg.data, msg.ticket)
                if(cache){
                    this.dataBase.add(collection, msg.data.newVal.id, msg.data.newVal)
                }
                break
            case 'update':
                this.update(msg.data, msg.ticket)
                break
            case 'delete':
                this.delete(msg.data.id, msg.ticket)
                if(cache){
                    this.dataBase.delete(collection, msg.data.id)
                }
                break
        }
    }

    add(doc, t){
        doc = doc.newVal
        let aux = this.collections[t].get(':'+t) || this.collections[t].get(doc.id)
        //let tickets = aux && aux.tickets || new Set()
        //tickets.add(t)
        //doc.tickets = tickets
        this.collections[t].set(doc.id, doc)
        this.collections[t].delete(':'+t)
    }

    update(doc, t){
        doc = doc.newVal
        //doc.tickets = this.collections[t].get(doc.id).tickets
        //doc.tickets.add(t)
        this.collections[t].set(doc.id, doc)
    }

    delete(id, t){
        let doc = this.collections[t].get(id)
        //let tickets = new Set([...doc.tickets])
        //tickets.delete(t)
        //if(tickets.size == 0) {
        this.collections[t].delete(id)
        //}else{
        //    console.log('tickets antes del delete', [...doc.tickets])
        //    doc = Object.assign({}, doc)
        //    doc.tickets = tickets
        //    console.log('tickets despues del delete', [...doc.tickets])
        //    console.log('delete con update')
        //    this.collections[collection].set(id, doc)
        //}
    }

}

export const store = new collectionStoreActor()
