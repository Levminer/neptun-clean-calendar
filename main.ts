function filterIcs(icsText: string): Uint8Array {
	// Events are separated by new lines
	const lines = icsText.split(/\r?\n/)
	const filteredLines: string[] = []

	let currentEvent: string[] = []
	let inEvent = false
	let skipEvent = false
	let totalEvents = 0
	let removedEvents = 0

	// Iterate over lines and remove lines that begin with "SUMMARY:["
	for (const line of lines) {
		if (line.trim() === "BEGIN:VEVENT") {
			inEvent = true
			skipEvent = false
			currentEvent = [line]
			totalEvents++
		} else if (line.trim() === "END:VEVENT") {
			currentEvent.push(line)

			// Add the event if we're not skipping it
			if (!skipEvent) {
				filteredLines.push(...currentEvent)
			} else {
				removedEvents++
			}

			inEvent = false
			currentEvent = []
		} else if (inEvent) {
			// Check if this is a SUMMARY line that starts with [ BEFORE adding it
			if (line.startsWith("SUMMARY:[")) {
				skipEvent = true
			}

			// Always add the line to current event (we decide what to do with the complete event later)
			currentEvent.push(line)
		} else {
			// Not in an event, add the line (header, calendar properties, etc.)
			filteredLines.push(line)
		}
	}

	console.log(`Filtered calendar: ${removedEvents} events removed out of ${totalEvents} total events`)

	const filteredText = filteredLines.join("\n")
	const body = new TextEncoder().encode(filteredText)

	return body
}

Deno.serve(async (req) => {
	const { searchParams } = new URL(req.url)
	const link = searchParams.get("link")

	if (!link) {
		return new Response("Missing required query parameter: link=<ics-url>", { status: 400 })
	}

	try {
		const upstream = await fetch(link)
		if (!upstream.ok) {
			return new Response(`Failed to fetch upstream ICS: ${upstream.status} ${upstream.statusText}`, { status: 502 })
		}

		const text = await upstream.text()
		const body = filterIcs(text)

		return new Response(body, {
			headers: {
				"Content-Type": "text/calendar; charset=utf-8",
				"Content-Disposition": 'inline; filename="filtered.ics"',
				"Cache-Control": "public, max-age=300",
			},
		})
	} catch (err) {
		console.error(err)
		return new Response("Internal error processing ICS.", { status: 500 })
	}
})
