import EventEmitter from 'eventemitter2'
import Q from 'q'

export class Actor extends EventEmitter{
    constructor(){
        super()
        this.input = []
    }

    tell(input){
        this.input.push(input)
        this.emmit('input')
    }

    ask(input){
        let deferred = Q.defer()
        this.input.push(deferred, input)
        this.emmit('input')
        return deferred.promise
    }
}