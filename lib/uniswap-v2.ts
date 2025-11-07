import { ETH_RPC_ENDPOINTS } from "./token-decimals";

export const UNISWAP_V2_ROUTER = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";

const toHexQuantity = (value: bigint | string): string => {
  const bigValue = typeof value === "bigint" ? value : BigInt(value);
  return "0x" + bigValue.toString(16);
};

const padHex = (hex: string): string => hex.replace(/^0x/, "").padStart(64, "0");

const encodeGetAmountsOut = (amountIn: string, path: string[]): string => {
  const functionSignature = "0xd06ca61f"; // getAmountsOut(uint256,address[])
  const amountInHex = padHex(toHexQuantity(amountIn));
  const offsetHex = padHex("0x40");
  const lengthHex = padHex("0x" + path.length.toString(16));
  const encodedPath = path.map((addr) => padHex(addr)).join("");

  return functionSignature + amountInHex + offsetHex + lengthHex + encodedPath;
};

const decodeUintArrayFromAbi = (data: string): bigint[] => {
  if (!data || data === "0x") return [];
  const clean = data.replace(/^0x/, "");
  if (clean.length < 128) {
    return [];
  }

  const headOffsetBytes = parseInt(clean.slice(0, 64), 16);
  const offset = headOffsetBytes * 2;
  if (Number.isNaN(offset) || clean.length < offset + 64) {
    return [];
  }

  const length = parseInt(clean.slice(offset, offset + 64), 16);
  const values: bigint[] = [];
  let cursor = offset + 64;
  for (let i = 0; i < length; i++) {
    if (clean.length < cursor + 64) break;
    const valueHex = clean.slice(cursor, cursor + 64);
    values.push(BigInt("0x" + valueHex));
    cursor += 64;
  }
  return values;
};

export async function fetchUniswapV2AmountsOut(
  amountIn: string,
  path: string[],
  logPrefix = "[Uniswap]"
): Promise<bigint[] | null> {
  const data = encodeGetAmountsOut(amountIn, path);
  console.log(`${logPrefix} 🧮 eth_call payload:`, data);

  for (const endpoint of ETH_RPC_ENDPOINTS) {
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: Date.now(),
          method: "eth_call",
          params: [
            {
              to: UNISWAP_V2_ROUTER,
              data,
            },
            "latest",
          ],
        }),
      });

      const body = await response.json();

      if (body?.error || !body?.result || body.result === "0x") {
        console.warn(`${logPrefix} ⚠️ eth_call failed via ${endpoint}`, body?.error || body);
        continue;
      }

      console.log(`${logPrefix} 🧾 eth_call result via ${endpoint}:`, body.result);

      const amounts = decodeUintArrayFromAbi(body.result as string);
      if (!amounts.length) {
        console.warn(`${logPrefix} ⚠️ No amounts returned from Uniswap via ${endpoint}`);
        continue;
      }

      return amounts;
    } catch (error) {
      console.error(`${logPrefix} ❌ RPC quote error via ${endpoint}`, error);
      continue;
    }
  }

  return null;
}


