@page can-stache.Acquisition Template Acquisition
@parent can-stache.pages 3

There are number of ways to acquire templates such as: raw text,
URL, or script tags in the markup.

__Raw Text__

Raw text can be templated by passing the text containing your template.  For example:

	var text = "My body lies over the {{.}}",
		template = stache(text),
		fragment = template("ocean");
	
	document.body.appendChild(fragment);
