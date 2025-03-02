import { status } from "./response";

class AppError extends Error{
    public readonly statusCode: number
    public readonly status: status


    constructor(message: string, statusCode: number, status:status) {
        super(message);
        this.statusCode = statusCode;
        this.status = status
    }
}

export {AppError}