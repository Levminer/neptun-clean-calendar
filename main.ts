import { serve } from "@hono/node-server"
import { Hono } from "hono"

function filterIcs(icsText: string): string {
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

	return filteredText
}

const app = new Hono()

app.get("/", async (c) => {
	const link = c.req.query("link")

	if (!link) {
		return c.text("Missing required query parameter: link=<ics-url>", 400)
	}

	try {
		const upstream = await fetch(link)
		if (!upstream.ok) {
			return c.text(`Failed to fetch upstream ICS: ${upstream.status} ${upstream.statusText}`, 502)
		}

		const text = await upstream.text()
		const filteredText = filterIcs(text)

		return new Response(filteredText, {
			status: 200,
			headers: {
				"Content-Type": "text/calendar; charset=utf-8",
				"Content-Disposition": 'inline; filename="filtered.ics"',
				"Cache-Control": "public, max-age=300",
			},
		})
	} catch (err) {
		console.error(err)
		return c.text("Internal error processing ICS.", 500)
	}
})

const port = process.env.PORT ? parseInt(process.env.PORT) : 8000
console.log(`Server is running on port ${port}`)

serve({
	fetch: app.fetch,
	port: 8000,
})
