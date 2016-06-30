@page can-stache.Binding Live Binding
@parent can-stache.pages 5

Live binding refers to templates which update themselves 
as the data used in the stache tags change.

It's very common as the page is interacted with that the underlying 
data represented in the page changes.  Typically, you have callbacks 
in your AJAX methods or events and then update the content of your 
controls manually.

In this example, we have a simple user welcome screen.

	<h1>Welcome {{user}}!</h1>
	<p>
		{{#if messages}}
			You have {{messages}} new messages.
		{{else}}
			You no messages.
		{{/messages}}
	</p>

	var data = new Map({
		user: 'Tina Fey',
		messages: 0
	});

	var template = stache(document.querySelector("#template").innerHTML, data);

The template evaluates the `messages` and adds the hooks for live binding automatically.
Since we have no message it will render:

	<h1>Welcome Tina Fey!</h1>
	<p>You no messages.</p>

Now say we have a request that updates
the `messages` attribute to have `5` messages.  We 
call the [attr](can-map.prototype.attr) method on the [can-map] to update
the attribute to the new value.

	data.attr('message', 5)


After [can-map] receives this update, it will automatically
update the paragraph tag to reflect the new value.

	<p>You have 5 new message.</p>


For more information visit the [can-map] documentation.

### Binding between components
If you are looking for information on bindings between components like this:
```
(event)="key()" for event binding.
{prop}="key" for one-way binding to a child.
{^prop}="key" for one-way binding to a parent.
{(prop)}="key" for two-way binding.
```
See [can-stache-bindings].