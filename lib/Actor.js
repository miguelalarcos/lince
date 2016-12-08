const EventEmitter = require('eventemitter2')
const Q = require('q')

class Actor extends EventEmitter{
    constructor(name=null){
        super()
        this.name = name
        this.inProcess = false
        this.input = []
        this.on('input', ()=>this.onInput())
    }

    tell(...input){
        this.input.push(input)
        console.log('emit', this.inProcess)
        this.emit('input')
    }

    ask(...input){
        let deferred = Q.defer()
        input.splice(1,0,deferred)
        this.input.push(input)
        console.log('emit3', this.inProcess)
        this.emit('input', input.length)
        return deferred.promise
    }

    onInput(){
        if(!this.inProcess && this.input.length > 0) {
            this.inProcess = true
            console.log('oninput', this.name, this.input, this.input.length)
            let input = this.input.shift()
            let method = input[0]
            let args = input.slice(1)
            if (method.startsWith('async_')) {
                const done = () => {
                    console.log('in process', false)
                    this.inProcess = false
                    if (this.input.length > 0) {
                        this.emit('input')
                    }
                }
                this[method](...args, done)
            }
            else{
                this[method](...args)
                console.log('in process', false)
                this.inProcess = false
                if (this.input.length > 0) {
                    this.emit('input')
                }
            }
        }
    }
}

module.exports = Actor
