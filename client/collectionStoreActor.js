import {observable, asMap, asReference} from 'mobx'
import {T} from './Ticket.js'
import _ from 'lodash'
// import {Actor} from './Actor.js'
import Actor from '../lib/Actor.js'

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

    subscribe(promise, id, predicate, ...args){
        let ticket = T.getTicket(predicate, args)
        if(!this.collections[ticket]) {
            this.collections[ticket] = observable(asMap([], asReference))
        }
        this.activeTickets.add(ticket)
        //let name = this.registered[predicate]
        let collection = this.collections[ticket]
        promise.resolve({ticket, collection})
        if(this.subsId[id]) {
            delete this.collections[this.subsId[id]]
            this.ws.tell('unsubscribe', this.subsId[id])
            this.activeTickets.delete(this.subsId[id])
        }
        this.subsId[id] = ticket
        args.unshift(predicate)
        this.ws.tell('subscribe', args, ticket)
    }

    //newCollection(name){
    //    this.collections[name] = observable(asMap([], asReference))
    //}

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
                break
            case 'update':
                this.update(msg.data, msg.ticket)
                break
            case 'delete':
                this.delete(msg.data.id, msg.ticket)
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
