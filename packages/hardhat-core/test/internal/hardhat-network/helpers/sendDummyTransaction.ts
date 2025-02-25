import { numberToRpcQuantity } from "../../../../src/internal/core/jsonrpc/types/base-types";
import { EthereumProvider } from "../../../../types";

import { DEFAULT_ACCOUNTS_ADDRESSES } from "./providers";

export async function sendDummyTransaction(
  provider: EthereumProvider,
  nonce: number,
  {
    from = DEFAULT_ACCOUNTS_ADDRESSES[0],
    to = DEFAULT_ACCOUNTS_ADDRESSES[1],
  } = {}
) {
  return provider.send("eth_sendTransaction", [
    {
      from,
      to,
      nonce: numberToRpcQuantity(nonce),
      gas: numberToRpcQuantity(21_000),
    },
  ]);
}
