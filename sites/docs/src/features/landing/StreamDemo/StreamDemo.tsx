/** biome-ignore-all lint/a11y/useSemanticElements: Keep preformatted code as a named, keyboard-scrollable region. */
'use client'

import styles from './StreamDemo.module.css'
import { useCallback, useEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import { highlight, render, type Token } from '@vortexlabs/kirari'
import { typescript } from '@vortexlabs/kirari/languages'
import { createTokenStream } from '@vortexlabs/kirari/stream'
import { streamSample } from './StreamDemo.constants'
import { reducedMotion } from '@/client/motion'
import { focusableWhenScrollable } from '@/client/scrollable'
import { HighlightedCode } from '@/components/code/HighlightedCode'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export const StreamDemo = () => {
	const frame = useRef<HTMLDivElement>(null)
	const timer = useRef<gsap.core.Tween | null>(null)
	const [html, setHTML] = useState(() =>
		highlight(streamSample, {
			language: typescript,
		}),
	)
	const [status, setStatus] = useState('reply.ts')
	const [streaming, setStreaming] = useState(false)
	const play = useCallback(() => {
		timer.current?.kill()
		const stream = createTokenStream(typescript)
		const tokens: Token[] = []
		let offset = 0
		let patches = 0
		setStreaming(true)
		const step = () => {
			const size = 1 + Math.floor(Math.random() * 6)
			const chunk = streamSample.slice(offset, offset + size)
			offset += chunk.length
			const done = offset >= streamSample.length
			const patch = done ? stream.end(chunk) : stream.write(chunk)
			const stale = tokens.findIndex(token => token.start >= patch.from)
			if (stale >= 0) tokens.length = stale
			tokens.push(...patch.tokens)
			patches++
			setHTML(render(tokens))
			setStatus(
				done
					? `reply.ts · ${patches} patches, ${stream.mode} mode`
					: `streaming · ${patches} patches`,
			)
			if (done) setStreaming(false)
			else timer.current = gsap.delayedCall(0.018 + Math.random() * 0.05, step)
		}
		step()
	}, [])
	useEffect(() => {
		if (reducedMotion() || !frame.current) return
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) {
					observer.disconnect()
					play()
				}
			},
			{
				rootMargin: '0px 0px -20% 0px',
			},
		)
		observer.observe(frame.current)
		return () => observer.disconnect()
	}, [
		play,
	])
	useEffect(
		() => () => {
			timer.current?.kill()
		},
		[],
	)

	return (
		<div
			ref={frame}
			className={styles.root}
			data-palette="dusk"
			data-streaming={streaming ? '' : undefined}
		>
			<div className={styles.streamBar}>
				<span className={styles.streamDot} aria-hidden="true" />
				<span id="stream-status">{status}</span>
				<Button
					variant="tertiary"
					size="xs"
					className={styles.streamReplay}
					startIcon={<Icon name="reset" size={14} />}
					onClick={play}
				>
					Replay
				</Button>
			</div>
			<pre
				role="region"
				className={`kirari ${styles.streamCode}`}
				aria-label="Streaming example"
				ref={focusableWhenScrollable}
			>
				<HighlightedCode
					id="stream-output"
					html={html + (streaming ? `<span class="${styles.streamCaret}"></span>` : '')}
				/>
			</pre>
		</div>
	)
}
