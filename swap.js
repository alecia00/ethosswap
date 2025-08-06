// --- swap.js ---
const routerAbi = [
  "function getAmountsOut(uint amountIn, address[] memory path) view returns (uint[] memory amounts)",
  "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) payable returns (uint[] memory amounts)",
  "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) returns (uint[] memory amounts)"
];
const ROUTER_ADDRESS = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488d";
const AIR_ADDRESS = "0xD277B8Bef27Af6c2dC0A8aEdDD23A57637892270";
const WETH_ADDRESS = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";

// Fungsi swap utama
async function swapUniswap({fromToken, toToken, amount, signer, onProgress, onSuccess, onError}) {
  try {
    const router = new ethers.Contract(ROUTER_ADDRESS, routerAbi, signer);
    let userAddress = await signer.getAddress();
    let decimals = 18;
    let amountIn = ethers.utils.parseUnits(amount.toString(), decimals);

    let path, tx;
    if (fromToken === "ETH" && toToken === "AIR") {
      path = [WETH_ADDRESS, AIR_ADDRESS];
      let amountsOut = await router.getAmountsOut(amountIn, path);
      let minOut = amountsOut[1].mul(95).div(100);
      if (onProgress) onProgress("Swapping ETH to AIR...");
      tx = await router.swapExactETHForTokens(
        minOut, path, userAddress, Math.floor(Date.now() / 1000) + 60 * 10, { value: amountIn }
      );
    } else if (fromToken === "AIR" && toToken === "ETH") {
      path = [AIR_ADDRESS, WETH_ADDRESS];
      let air = new ethers.Contract(AIR_ADDRESS, ["function approve(address,uint256) external returns (bool)", "function allowance(address,address) view returns (uint256)"], signer);
      let allowance = await air.allowance(userAddress, ROUTER_ADDRESS);
      if (allowance.lt(amountIn)) {
        if (onProgress) onProgress("Approving AIR...");
        let approveTx = await air.approve(ROUTER_ADDRESS, ethers.constants.MaxUint256);
        await approveTx.wait();
      }
      let amountsOut = await router.getAmountsOut(amountIn, path);
      let minOut = amountsOut[1].mul(95).div(100);
      if (onProgress) onProgress("Swapping AIR to ETH...");
      tx = await router.swapExactTokensForETH(
        amountIn, minOut, path, userAddress, Math.floor(Date.now() / 1000) + 60 * 10
      );
    } else {
      throw new Error("Unsupported swap pair");
    }
    if (onProgress) onProgress("Waiting for confirmation...");
    await tx.wait();
    if (onSuccess) onSuccess(tx);
  } catch (err) {
    if (onError) onError(err);
  }
}
