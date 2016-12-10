class Ticket{
    constructor(){
        let ticket = localStorage.ticket || '1'
        this.ticket = ticket
    }

    getTicket(){
        let ticket = this.ticket
        localStorage.ticket = '' + (parseInt(ticket) + 1)
        return ticket
    }
}

export const T = new Ticket()