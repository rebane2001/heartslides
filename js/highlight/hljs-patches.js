document.addEventListener("DOMContentLoaded", (event) => {
	const cssKeywords = hljs.getLanguage("css").contains.find(e=>e.begin?.toString()?.includes?.("position"));
	const additionalKeywords = "contain|initial-value|inherits|syntax|result|preserve-3d|shape-outside|";
	cssKeywords.begin = cssKeywords.begin.replace(/position\|/,`position|${additionalKeywords}`);
	//cssKeywords.keywords = {$pattern: /[\w-]+/gim, keyword: "preserve-3d"}; // replacing /\w+/gim
});
