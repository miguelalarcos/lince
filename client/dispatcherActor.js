import {T} from './Ticket.js'
import {Actor} from './Actor.js'
//import Q from 'q'

class DispatcherActor extends Actor{
    constructor(){
        super()
        this.results = {}
        this.ws = null
        this.promises = {}
    }

    rpc(promise, method, ...args){
        console.log('action actor rpc', method, args)
        let t = T.getTicket()
        /*let rv = args.slice(-1)[0]

        if(rv.name.startsWith('ObservableValue')){
            rv = args.pop()
            this.results[t] = rv
        }
        */
        this.ws.tell(method, args, t)
        this.promises[t] = promise
    }

    notify(msg){
        console.log('Dispatcher actor notify', msg)
        /*let rv = this.results[msg.ticket]
        if(rv) {
            rv.set(msg.value)
            delete this.results[msg.ticket]
        }
        */
        this.promises[msg.ticket].resolve(msg.data)
        delete this.promises[msg.ticket]
    }
}

export const dispatcher = new DispatcherActor()
