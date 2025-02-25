import { Block } from "@ethereumjs/block";
import { TypedTransaction } from "@ethereumjs/tx";
import {
  PostByzantiumTxReceipt,
  RunBlockResult,
} from "@ethereumjs/vm/dist/runBlock";
import { BN } from "ethereumjs-util";

import { assertHardhatInvariant } from "../../core/errors";
import {
  bufferToRpcData,
  numberToRpcQuantity,
} from "../../core/jsonrpc/types/base-types";
import { RpcLog } from "../../core/jsonrpc/types/output/log";
import { RpcTransactionReceipt } from "../../core/jsonrpc/types/output/receipt";

// TODO: These types should be moved to core, and probably inferred by io-ts
export interface RpcBlockOutput {
  difficulty: string;
  extraData: string;
  gasLimit: string;
  gasUsed: string;
  hash: string | null;
  logsBloom: string | null;
  miner: string;
  mixHash: string | null;
  nonce: string | null;
  number: string | null;
  parentHash: string;
  receiptsRoot: string;
  sha3Uncles: string;
  size: string;
  stateRoot: string;
  timestamp: string;
  totalDifficulty: string;
  transactions: string[] | RpcTransactionOutput[];
  transactionsRoot: string;
  uncles: string[];
}

export interface RpcTransactionOutput {
  blockHash: string | null;
  blockNumber: string | null;
  from: string;
  gas: string;
  gasPrice: string;
  hash: string;
  input: string;
  nonce: string;
  r: string; // This is documented as DATA, but implementations use QUANTITY
  s: string; // This is documented as DATA, but implementations use QUANTITY
  to: string | null;
  transactionIndex: string | null;
  v: string;
  value: string;
}

export interface RpcReceiptOutput {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  from: string;
  gasUsed: string;
  logs: RpcLogOutput[];
  logsBloom: string;
  status: string;
  to: string | null;
  transactionHash: string;
  transactionIndex: string;
}

export interface RpcLogOutput {
  address: string;
  blockHash: string | null;
  blockNumber: string | null;
  data: string;
  logIndex: string | null;
  removed: boolean;
  topics: string[];
  transactionHash: string | null;
  transactionIndex: string | null;
}

// tslint:disable only-hardhat-error

export function getRpcBlock(
  block: Block,
  totalDifficulty: BN,
  includeTransactions = true,
  pending = false
): RpcBlockOutput {
  const transactions = includeTransactions
    ? block.transactions.map((tx, index) => getRpcTransaction(tx, block, index))
    : block.transactions.map((tx) => bufferToRpcData(tx.hash()));

  return {
    number: pending ? null : numberToRpcQuantity(new BN(block.header.number)),
    hash: pending ? null : bufferToRpcData(block.hash()),
    parentHash: bufferToRpcData(block.header.parentHash),
    // We pad this to 8 bytes because of a limitation in The Graph
    // See: https://github.com/nomiclabs/hardhat/issues/491
    nonce: pending ? null : bufferToRpcData(block.header.nonce, 8),
    mixHash: pending ? null : bufferToRpcData(block.header.mixHash, 32),
    sha3Uncles: bufferToRpcData(block.header.uncleHash),
    logsBloom: pending ? null : bufferToRpcData(block.header.bloom),
    transactionsRoot: bufferToRpcData(block.header.transactionsTrie),
    stateRoot: bufferToRpcData(block.header.stateRoot),
    receiptsRoot: bufferToRpcData(block.header.receiptTrie),
    miner: bufferToRpcData(block.header.coinbase.toBuffer()),
    difficulty: numberToRpcQuantity(new BN(block.header.difficulty)),
    totalDifficulty: numberToRpcQuantity(totalDifficulty),
    extraData: bufferToRpcData(block.header.extraData),
    size: numberToRpcQuantity(block.serialize().length),
    gasLimit: numberToRpcQuantity(new BN(block.header.gasLimit)),
    gasUsed: numberToRpcQuantity(new BN(block.header.gasUsed)),
    timestamp: numberToRpcQuantity(new BN(block.header.timestamp)),
    transactions,
    uncles: block.uncleHeaders.map((uh: any) => bufferToRpcData(uh.hash())),
  };
}

export function getRpcTransaction(
  tx: TypedTransaction,
  block: Block,
  index: number
): RpcTransactionOutput;

export function getRpcTransaction(
  tx: TypedTransaction,
  block: "pending"
): RpcTransactionOutput;

export function getRpcTransaction(
  tx: TypedTransaction,
  block: Block | "pending",
  index?: number
): RpcTransactionOutput {
  // only already signed transactions should be used here,
  // but there is no type in ethereumjs for that
  assertHardhatInvariant(tx.v !== undefined, "tx should be signed");
  assertHardhatInvariant(tx.r !== undefined, "tx should be signed");
  assertHardhatInvariant(tx.s !== undefined, "tx should be signed");

  return {
    blockHash: block === "pending" ? null : bufferToRpcData(block.hash()),
    blockNumber:
      block === "pending"
        ? null
        : numberToRpcQuantity(new BN(block.header.number)),
    from: bufferToRpcData(tx.getSenderAddress().toBuffer()),
    gas: numberToRpcQuantity(new BN(tx.gasLimit)),
    gasPrice: numberToRpcQuantity(new BN(tx.gasPrice)),
    hash: bufferToRpcData(tx.hash()),
    input: bufferToRpcData(tx.data),
    nonce: numberToRpcQuantity(new BN(tx.nonce)),
    to: tx.to === undefined ? null : bufferToRpcData(tx.to.toBuffer()),
    transactionIndex: index !== undefined ? numberToRpcQuantity(index) : null,
    value: numberToRpcQuantity(new BN(tx.value)),
    v: numberToRpcQuantity(new BN(tx.v)),
    r: numberToRpcQuantity(new BN(tx.r)),
    s: numberToRpcQuantity(new BN(tx.s)),
  };
}

export function getRpcReceipts(
  block: Block,
  runBlockResult: RunBlockResult
): RpcReceiptOutput[] {
  const receipts: RpcReceiptOutput[] = [];

  let cumulativeGasUsed = new BN(0);

  for (let i = 0; i < runBlockResult.results.length; i += 1) {
    const tx = block.transactions[i];
    const { createdAddress, gasUsed } = runBlockResult.results[i];
    const receipt = runBlockResult.receipts[i];

    cumulativeGasUsed = cumulativeGasUsed.add(new BN(receipt.gasUsed));

    const logs = receipt.logs.map((log, logIndex) =>
      getRpcLogOutput(log, tx, block, i, logIndex)
    );

    receipts.push({
      transactionHash: bufferToRpcData(tx.hash()),
      transactionIndex: numberToRpcQuantity(i),
      blockHash: bufferToRpcData(block.hash()),
      blockNumber: numberToRpcQuantity(new BN(block.header.number)),
      from: bufferToRpcData(tx.getSenderAddress().toBuffer()),
      to: tx.to === undefined ? null : bufferToRpcData(tx.to.toBuffer()),
      cumulativeGasUsed: numberToRpcQuantity(cumulativeGasUsed),
      gasUsed: numberToRpcQuantity(gasUsed),
      contractAddress:
        createdAddress !== undefined
          ? bufferToRpcData(createdAddress.toBuffer())
          : null,
      logs,
      logsBloom: bufferToRpcData(receipt.bitvector),
      status: numberToRpcQuantity((receipt as PostByzantiumTxReceipt)?.status),
    });
  }

  return receipts;
}

export function toRpcReceiptOutput(
  receipt: RpcTransactionReceipt
): RpcReceiptOutput {
  return {
    blockHash: bufferToRpcData(receipt.blockHash),
    blockNumber: numberToRpcQuantity(receipt.blockNumber),
    contractAddress:
      receipt.contractAddress !== null
        ? bufferToRpcData(receipt.contractAddress)
        : null,
    cumulativeGasUsed: numberToRpcQuantity(receipt.cumulativeGasUsed),
    from: bufferToRpcData(receipt.from),
    gasUsed: numberToRpcQuantity(receipt.gasUsed),
    logs: receipt.logs.map(toRpcLogOutput),
    logsBloom: bufferToRpcData(receipt.logsBloom),
    status: numberToRpcQuantity(receipt.status),
    to: receipt.to !== null ? bufferToRpcData(receipt.to) : null,
    transactionHash: bufferToRpcData(receipt.transactionHash),
    transactionIndex: numberToRpcQuantity(receipt.transactionIndex),
  };
}

export function toRpcLogOutput(log: RpcLog, index?: number): RpcLogOutput {
  return {
    removed: false,
    address: bufferToRpcData(log.address),
    blockHash: log.blockHash !== null ? bufferToRpcData(log.blockHash) : null,
    blockNumber:
      log.blockNumber !== null ? numberToRpcQuantity(log.blockNumber) : null,
    data: bufferToRpcData(log.data),
    logIndex: index !== undefined ? numberToRpcQuantity(index) : null,
    transactionIndex:
      log.transactionIndex !== null
        ? numberToRpcQuantity(log.transactionIndex)
        : null,
    transactionHash:
      log.transactionHash !== null
        ? bufferToRpcData(log.transactionHash)
        : null,
    topics: log.topics.map((topic) => bufferToRpcData(topic)),
  };
}

function getRpcLogOutput(
  log: any[],
  tx: TypedTransaction,
  block?: Block,
  transactionIndex?: number,
  logIndex?: number
): RpcLogOutput {
  return {
    removed: false,
    logIndex: logIndex !== undefined ? numberToRpcQuantity(logIndex) : null,
    transactionIndex:
      transactionIndex !== undefined
        ? numberToRpcQuantity(transactionIndex)
        : null,
    transactionHash: block !== undefined ? bufferToRpcData(tx.hash()) : null,
    blockHash: block !== undefined ? bufferToRpcData(block.hash()) : null,
    blockNumber:
      block !== undefined
        ? numberToRpcQuantity(new BN(block.header.number))
        : null,
    address: bufferToRpcData(log[0]),
    data: bufferToRpcData(log[2]),
    topics: log[1].map((topic: Buffer) => bufferToRpcData(topic)),
  };
}
