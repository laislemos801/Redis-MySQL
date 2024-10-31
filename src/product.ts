import { RowDataPacket } from "mysql2"

export interface Product extends RowDataPacket {
    ID: number
    NAME: string
    PRICE: number
    DESCRIPTION: string 
}