/* Sainsbury reach estimate: independent-exposure model. NOT verified unique reach. */
(function(root){
"use strict";
function validUniverse(x){
 const n=Number(x);return Number.isFinite(n)&&Number.isSafeInteger(n)&&n>0?n:null;
}
function estimate(reaches,universe){
 const U=validUniverse(universe);
 if(!U||!Array.isArray(reaches)||!reaches.length)return null;
 let logUnreached=0,hasValues=false,largest=0;
 for(const value of reaches){
  const r=Number(value);
  if(!Number.isFinite(r)||r<0)return null;
  if(r>U)return null;
  if(r===0)continue;
  hasValues=true;largest=Math.max(largest,r);
  if(r===U)return U;
  logUnreached+=Math.log1p(-r/U);
 }
 if(!hasValues)return 0;
 const est=-U*Math.expm1(logUnreached);
 return Math.round(Math.max(largest,Math.min(U,est)));
}
function currentUniverse(){return validUniverse(root.CITROEN_METRIC_OVERRIDES?.universe);}
root.CITROEN_REACH_MATH={validUniverse,estimate,currentUniverse,formula:"U × [1 − Π(1 − alcance_i/U)]",method:"Estimación Sainsbury (solapamiento aleatorio; no deduplicación observada)"};
if(typeof module!=="undefined"&&module.exports)module.exports=root.CITROEN_REACH_MATH;
})(typeof window!=="undefined"?window:{});
