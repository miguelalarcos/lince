import {observable, asMap, asReference} from 'mobx'
import {T} from './Ticket.js'
import _ from 'lodash'
import {Actor} from './Actor.js'

class collectionStoreActor extends Actor{
    constructor(){
        super()
        this.ws = null
        this.collections = {}
        this.metadata = observable(asMap())
        this.predicates = {}
        this.promises = {}
        this.subsId = {}
        this.registered = {}
        this.activeTickets = new Set()
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

    subscribe(promise, id, predicate, args=[]){
        console.log('subscribe en store', promise, id, predicate, args)
        let ticket = T.getTicket(predicate, args)
        this.activeTickets.add(ticket)
        let name = this.registered[predicate]
        if(this.subsId[id]) {
            this.ws.tell('unsubscribe', this.subsId[id])
            this.activeTickets.delete(this.subsId[id])
        }
        this.subsId[id] = ticket
        this.ws.tell('subscribe', predicate, args, ticket)
        let collection = this.collections[name]
        promise.resolve({ticket, collection})
    }

    newCollection(name){
        this.collections[name] = observable(asMap([], asReference))
    }

    register(predicate, collection){
        this.registered[predicate] = collection
        // this.predicates.register(predicate, coll)
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

    notify(msg){
        console.log('notify', msg)
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
                this.add(this.getCollection(msg.predicate), msg.data, msg.ticket)
                break
            case 'update':
                this.update(this.getCollection(msg.predicate), msg.data, msg.ticket)
                break
            case 'delete':
                this.delete(this.getCollection(msg.predicate), msg.data.id, msg.ticket)
                break
        }
    }

    add(collection, doc, t){
        console.log('insert', collection, doc, t)
        doc = doc.newVal
        let aux = this.collections[collection].get(':'+t) || this.collections[collection].get(doc.id)
        let tickets = aux && aux.tickets || new Set()
        tickets.add(t)
        doc.tickets = tickets
        this.collections[collection].set(doc.id, doc)
        this.collections[collection].delete(':'+t)
    }

    update(collection, doc, t){
        doc.tickets = this.collections[collection].get(doc.id).tickets
        doc.tickets.add(t)
        this.collections[collection].set(doc.id, doc)
    }

    delete(collection, id, t){
        let doc = this.collections[collection].get(id)
        let tickets = new Set([...doc.tickets])

        tickets.delete(t)
        if(tickets.size == 0) {
            this.collections[collection].delete(id)
        }else{
            doc.tickets = tickets
            this.collections[collection].set(doc.id, doc)
        }
    }

}

export const store = new collectionStoreActor()
