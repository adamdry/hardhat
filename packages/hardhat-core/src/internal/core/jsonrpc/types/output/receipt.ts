import * as t from "io-ts";

import { nullable } from "../../../../util/io-ts";
import { rpcAddress, rpcData, rpcHash, rpcQuantity } from "../base-types";

import { rpcLog } from "./log";

export type RpcTransactionReceipt = t.TypeOf<typeof rpcTransactionReceipt>;
export const rpcTransactionReceipt = t.type(
  {
    transactionHash: rpcHash,
    transactionIndex: rpcQuantity,
    blockHash: rpcHash,
    blockNumber: rpcQuantity,
    from: rpcAddress,
    to: nullable(rpcAddress),
    cumulativeGasUsed: rpcQuantity,
    gasUsed: rpcQuantity,
    contractAddress: nullable(rpcAddress),
    logs: t.array(rpcLog, "RpcLog Array"),
    logsBloom: rpcData,
    status: rpcQuantity,
  },
  "RpcTransactionReceipt"
);
