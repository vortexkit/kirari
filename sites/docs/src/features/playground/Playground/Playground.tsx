'use client'

import styles from './Playground.module.css'
import { useRouter } from 'next/navigation'
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { tokenize, render, tokenTypes, type Token } from '@vortexlabs/kirari/core'
import { css, javascript, tsx } from '@vortexlabs/kirari/languages'
import { languageEntries } from '@/lib/languages'
import { animateIn } from '@/client/motion'
import { usageCode } from './Playground.utilities'
import { groups, outputs } from './Playground.data'
import { Button } from '@/components/ui/Button'
import { CopyButton } from '@/components/ui/CopyButton'
import { Icon } from '@/components/ui/Icon'
import { Link } from '@/components/ui/Link'
import { PlaygroundQuery } from '@/features/playground/PlaygroundQuery'
import { PreviewOutput } from '@/features/playground/PreviewOutput'
import { SegmentedControl } from '@/components/ui/SegmentedControl'
import { SelectGroup } from '@/components/ui/SelectGroup'
import type * as Types from './Playground.types'

const initial = languageEntries.find(entry => entry.id === 'javascript')!

export const Playground = (props: Types.Props) => {
	const { themes } = props
	const router = useRouter()
	const [language, setLanguage] = useState(initial.id)
	const [source, setSource] = useState(initial.sample)
	const [theme, setTheme] = useState('daylight')
	const [overrides, setOverrides] = useState<Record<string, string>>({})
	const [output, setOutput] = useState<Types.Output>('preview')
	const [usage, setUsage] = useState<Types.Usage>('js')
	const [picked, setPicked] = useState<Token | null>(null)
	const [status, setStatus] = useState('')
	const preview = useRef<HTMLPreElement>(null)
	const jsOutput = useRef<HTMLPreElement>(null)
	const cssOutput = useRef<HTMLPreElement>(null)
	const inspector = useRef<HTMLDivElement>(null)
	const entry = languageEntries.find(item => item.id === language)!
	const tokens = useMemo(
		() => tokenize(source, entry.language),
		[
			source,
			entry,
		],
	)
	const selected =
		tokens.find(token => token.type === picked?.type && token.value === picked.value) ??
		tokens.find(token => token.type === 'variable') ??
		tokens.find(token => token.type !== 'text')
	const palette = themes.find(item => item.id === theme)!
	const selectedColor = selected
		? (overrides[selected.type] ?? palette.colors[selected.type])
		: undefined
	const color = selectedColor && /^#[\da-f]{6}$/i.test(selectedColor) ? selectedColor : '#35435f'
	const themeCSS = `/* Needs a Kirari theme file imported */\n.my-code {\n${[
		'background',
		...tokenTypes,
	]
		.map(type => `  --kirari-${type}: ${overrides[type] ?? palette.colors[type] ?? ''};`)
		.join('\n')}\n}`
	const usageSource = usageCode({
		name: entry.language.name,
		theme,
		source,
		usage,
	})
	const usageHTML =
		output === 'js' || output === 'react' || output === 'markdown'
			? render(tokenize(usageSource, usage === 'react' ? tsx : javascript))
			: ''
	const themeHTML = output === 'css' ? render(tokenize(themeCSS, css)) : ''
	const applyLanguage = useCallback((id: string) => {
		const next = languageEntries.find(item => item.id === id)
		if (!next) return
		setLanguage(id)
		setSource(next.sample)
		setPicked(null)
		setOutput('preview')
		setStatus(`${next.label} example loaded.`)
	}, [])
	useEffect(() => {
		animateIn(
			output === 'preview'
				? preview.current
				: output === 'css'
					? cssOutput.current
					: jsOutput.current,
		)
	}, [
		output,
	])
	const inspect = (token: Token) => {
		setPicked(token)
		animateIn(inspector.current)
	}

	return (
		<main id="main" tabIndex={-1} className={styles.root}>
			<Suspense fallback={null}>
				<PlaygroundQuery onLanguage={applyLanguage} />
			</Suspense>
			<h1 className="sr-only">Kirari playground</h1>
			<div className={styles.playground}>
				<div className={styles.playgroundToolbar}>
					<div className={styles.languagePicker}>
						<Icon name="code" size={16} />
						<label className="sr-only" htmlFor="language-select">
							Language
						</label>
						<select
							id="language-select"
							value={language}
							onChange={event => {
								applyLanguage(event.target.value)
								router.replace(`/playground/?lang=${event.target.value}`, {
									scroll: false,
								})
							}}
						>
							{groups.map(group => (
								<SelectGroup
									key={group}
									label={group}
									options={languageEntries.filter(item => item.group === group)}
								/>
							))}
						</select>
					</div>
					<div className={styles.themePicker} id="theme-picker" data-palette={theme}>
						<span className={styles.paletteSwatch} aria-hidden="true" />
						<label className="sr-only" htmlFor="theme-select">
							Code theme
						</label>
						<select
							id="theme-select"
							autoComplete="off"
							value={theme}
							onChange={event => {
								setTheme(event.target.value)
								setOverrides({})
								setStatus(
									`${event.target.selectedOptions[0]!.text} theme applied. Custom colors reset.`,
								)
							}}
						>
							{(
								[
									'light',
									'dark',
								] as const
							).map(appearance => (
								<SelectGroup
									key={appearance}
									label={appearance === 'light' ? 'Light' : 'Dark'}
									options={themes.filter(item => item.appearance === appearance)}
								/>
							))}
						</select>
					</div>
					<div className={styles.editorActions}>
						<Button
							variant="tertiary"
							size="sm"
							startIcon={<Icon name="reset" size={14} />}
							title="Restore the example code"
							onClick={() => applyLanguage(language)}
						>
							Reset
						</Button>
						<CopyButton text={themeCSS}>Copy CSS</CopyButton>
						<CopyButton text={usageSource}>Copy code</CopyButton>
					</div>
				</div>
				<div className={styles.editorPanes}>
					<div className={styles.sourcePane}>
						<div className={styles.paneLabel}>
							<label htmlFor="source">Source</label>
							<span id="source-filename" className={styles.sourceFilename}>
								{entry.filename}
							</span>
						</div>
						<textarea
							id="source"
							className={styles.source}
							spellCheck={false}
							autoCapitalize="off"
							autoComplete="off"
							maxLength={20000}
							aria-describedby="editor-help"
							value={source}
							onChange={event => {
								const value = event.target.value
								setSource(value.slice(0, 20000))
								if (value.length > 20000)
									setStatus('The playground is limited to 20,000 characters.')
							}}
						/>
					</div>
					<div
						className={styles.previewPane}
						id="preview-pane"
						data-palette={theme}
						style={Object.fromEntries(
							Object.entries(overrides).map(([type, value]) => [
								`--kirari-${type}`,
								value,
							]),
						)}
					>
						<div className={styles.paneLabel}>
							<SegmentedControl
								className={styles.outputSwitch}
								label="Output view"
								value={output}
								onChange={value => {
									setOutput(value)
									if (value === 'js' || value === 'react' || value === 'markdown')
										setUsage(value)
								}}
							>
								{outputs.map(item => (
									<SegmentedControl.Item key={item.value} value={item.value}>
										{item.label}
									</SegmentedControl.Item>
								))}
							</SegmentedControl>
							<span id="token-count" className={styles.tokenCount}>
								{tokens.length} tokens
							</span>
						</div>
						<pre
							ref={preview}
							className={`kirari ${styles.previewCode}`}
							id="preview"
							hidden={output !== 'preview'}
						>
							<code id="highlighted">
								{tokens.map(token =>
									token.type === 'text' ? (
										token.value
									) : (
										<button
											type="button"
											key={token.start}
											className={`kirari-${token.type} ${styles.inspectable}`}
											data-start={token.start}
											aria-label={`Inspect ${token.type}: ${token.value.slice(0, 80)}`}
											onClick={() => inspect(token)}
											onKeyDown={event => {
												if (event.key === 'Enter' || event.key === ' ') {
													event.preventDefault()
													inspect(token)
												}
											}}
											onFocus={event =>
												event.currentTarget.scrollIntoView({
													block: 'nearest',
													inline: 'nearest',
												})
											}
										>
											{token.value}
										</button>
									),
								)}
							</code>
						</pre>
						<PreviewOutput
							className={styles.previewCode}
							ref={jsOutput}
							id="js-output"
							label="Usage code"
							html={usageHTML}
							hidden={output !== 'js' && output !== 'react' && output !== 'markdown'}
						/>
						<PreviewOutput
							className={styles.previewCode}
							ref={cssOutput}
							id="css-output"
							label="Theme CSS"
							html={themeHTML}
							hidden={output !== 'css'}
						/>
					</div>
				</div>
				<div ref={inspector} className={styles.inspector} id="inspector">
					<span className="token-kind" id="token-kind">
						{selected?.type ?? 'text'}
					</span>
					<code id="token-variable">
						{selected ? `--kirari-${selected.type}` : 'No highlighted tokens'}
					</code>
					<div className={styles.inspectorEnd}>
						<span id="token-offset" className={styles.tokenOffset}>
							{selected
								? `Offset ${selected.start}–${selected.end}`
								: 'Try adding some code'}
						</span>
						<label
							className={styles.colorControl}
							title="Recolor every token of this type"
						>
							<input
								type="color"
								id="token-color"
								value={color}
								disabled={!selected}
								aria-label={
									selected
										? `Color for ${selected.type} tokens`
										: 'Selected token color'
								}
								onChange={event => {
									if (selected)
										setOverrides(value => ({
											...value,
											[selected.type]: event.target.value,
										}))
								}}
							/>
							<span>Color</span>
						</label>
					</div>
				</div>
			</div>
			<p className={styles.editorHelp} id="editor-help">
				Edit the code, click a token, then recolor its type. Everything runs in your
				browser.{' '}
				<Link href="/docs/theming/" variant="strong">
					How theming works
				</Link>
			</p>
			<p id="playground-status" className="sr-only" role="status" aria-live="polite">
				{status}
			</p>
		</main>
	)
}
