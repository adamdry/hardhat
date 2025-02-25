import { TxData } from "@ethereumjs/tx";

import { RpcTransaction } from "../../../core/jsonrpc/types/output/transaction";

export function rpcToTxData(rpcTransaction: RpcTransaction): TxData {
  return {
    gasLimit: rpcTransaction.gas,
    gasPrice: rpcTransaction.gasPrice,
    to: rpcTransaction.to ?? undefined,
    nonce: rpcTransaction.nonce,
    data: rpcTransaction.input,
    v: rpcTransaction.v,
    r: rpcTransaction.r,
    s: rpcTransaction.s,
    value: rpcTransaction.value,
  };
}
