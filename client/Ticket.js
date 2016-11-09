class Ticket{
    constructor(){
        this.ticket = 1
    }

    getTicket(){
        return this.ticket++
    }
}

export const T = new Ticket()