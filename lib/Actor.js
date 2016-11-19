EventEmitter = require('eventemitter2')
Q = require('q')

class Actor extends EventEmitter{
    constructor(){
        super()
        this.inProcess = false
        this.input = []
        this.on('input', ()=>this.onInput())
    }

    tell(...input){
        console.log('tell', input)
        this.input.push(input)
        this.emit('input')
    }

    ask(...input){
        console.log('ask', input)
        let deferred = Q.defer()
        input.splice(1,0,deferred)
        this.input.push(input)
        this.emit('input')
        return deferred.promise
    }

    onInput(){
        console.log('on input', this.input)
        if(!this.inProcess) {
            const done = () => {
                //this.input.shift()
                this.inProcess = false
                if(this.input.length > 0) {
                    this.emit('input')
                }
                console.log('done')
            }
            this.inProcess = true
            let input = this.input.shift() // [0]
            this.handle(input, done)
        }

        /*
        console.log('on input')
        if(this.inProcess || this.input.length == 0){
            return
        }
        if(this.input.length > 0){
            this.inProcess = true
            let input = this.input[0]
            this.handle(input)
            this.input.shift()
        }
        this.inProcess = false
        this.emit('input')
        */
    }

    handle(input, done) {
        console.log('handle', input)
        let method = input[0]
        let args = input.slice(1)
        //console.log(this, method, args)
        this[method](...args, done)
    }

}

module.exports = Actor
