import { status } from "./response";

class AppError extends Error{
    public readonly statusCode: number
    public readonly status: status
    public readonly data:any


    constructor(message: string, statusCode: number, status:status, data?:any) {
        super(message);
        this.statusCode = statusCode;
        this.status = status
        if(data){
            this.data = data
        }
    }
}

export {AppError}