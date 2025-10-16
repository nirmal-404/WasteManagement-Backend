import { WasteRecord, IWasteRecord } from "../models/WasteRecord";

export class WasteRecordRepository {
  async findById(id: string): Promise<IWasteRecord | null> {
    return WasteRecord.findById(id);
  }
}
