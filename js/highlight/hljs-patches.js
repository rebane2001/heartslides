document.addEventListener("DOMContentLoaded", (event) => {
	const cssKeywords = hljs.getLanguage("css").contains.find(e=>e.begin?.toString()?.includes?.("position"));
	const additionalKeywords = "contain|initial-value|inherits|syntax|result|";
	cssKeywords.begin = cssKeywords.begin.replace(/position\|/,`position|${additionalKeywords}`)
});
