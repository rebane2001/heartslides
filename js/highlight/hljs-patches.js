document.addEventListener("DOMContentLoaded", (event) => {
	const cssKeywords = hljs.getLanguage("css").contains.find(e=>e.begin?.toString()?.includes?.("position"));
	const additionalKeywords = "contain|initial-value|inherits|syntax|result|preserve-3d|shape-outside|shape-margin|shape-image-threshold|translate|-webkit-box-reflect|frame-sizing|";
	cssKeywords.begin = cssKeywords.begin.replace(/position\|/,`position|${additionalKeywords}`);
	const cssHtmlTags = hljs.getLanguage("css").contains.find(e=>e.begin?.toString()?.includes?.("blockquote"));
	const additionalHtmlTags = "pre|";
	cssHtmlTags.begin = cssHtmlTags.begin.replace(/blockquote\|/,`blockquote|${additionalHtmlTags}`);
	//cssKeywords.keywords = {$pattern: /[\w-]+/gim, keyword: "preserve-3d"}; // replacing /\w+/gim
});
