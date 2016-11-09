import EventEmitter from 'eventemitter2'

/*
 export class Actor extends EventEmitter {
 constructor(){
 super()
 this.on('msg', (method, ...args)=>{
 console.log('on', method, args)
 this[method](...args)
 })
 }
 tell(method, ...args){
 this.emit('msg', method, ...args)
 }
 }*/

export class Actor extends EventEmitter{
    constructor(){
        super()
        this.input = []
    }

    tell(input){
        this.input.push(input)
        this.emmit('input')
    }
}