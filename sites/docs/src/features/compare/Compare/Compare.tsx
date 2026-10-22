import styles from './Compare.module.css'
import type { CSSProperties } from 'react'
import { highlight } from '@vortexlabs/kirari'
import { typescript } from '@vortexlabs/kirari/languages'
import {
	alternatives,
	features,
	libraries,
	snippets,
	streamingResults,
} from '@/features/compare/compare.data'
import { routes } from '@/lib/navigation'
import { Button } from '@/components/ui/Button'
import { CodeBlock } from '@/components/code/CodeBlock'
import { Icon } from '@/components/ui/Icon'
import { iconPaths } from '@/components/ui/Icon/Icon.constants'
import { Link } from '@/components/ui/Link'
import { CompareTable } from '@/features/compare/CompareTable'

const names = Object.fromEntries(
	libraries.map(library => [
		library.id,
		library.name,
	]),
)

const largestBundle = Math.max(...libraries.map(library => library.gzipBytes))

const Value = (props: { value: string | boolean }) => {
	const { value } = props
	if (typeof value === 'string') return value
	return (
		<span className={styles.mark} data-value={value}>
			<Icon name={value ? 'check' : 'close'} size={14} />
			<span className="sr-only">{value ? 'Yes' : 'No'}</span>
		</span>
	)
}

const LibraryHead = ({ streaming = false }: { streaming?: boolean }) => (
	<>
		<colgroup>
			<col className={styles.labelColumn} />
			{libraries.map(library => (
				<col key={library.id} />
			))}
		</colgroup>
		<thead>
			<tr>
				<td />
				{libraries.map(library => (
					<th
						key={library.id}
						scope="col"
						data-kirari={library.id === 'kirari' || undefined}
					>
						<Link
							href={library.href}
							variant="subtle"
							external={library.id !== 'kirari'}
						>
							{library.name}
						</Link>
						<span className={styles.version}>
							{library.version}
							{streaming && library.id === 'shiki' && ' · JavaScript engine'}
						</span>
					</th>
				))}
			</tr>
		</thead>
	</>
)

export const Compare = () => (
	<main id="main" tabIndex={-1} className={styles.root}>
		<header className={styles.header} data-intro>
			<h1>
				<span className={styles.headingName}>
					Kirari
					<svg viewBox="0 0 24 24" aria-hidden="true">
						<defs>
							<clipPath id="compare-star-shape">{iconPaths.sparkle}</clipPath>
							<linearGradient id="compare-star-glaze">
								<stop offset="0" stopColor="white" stopOpacity="0" />
								<stop offset="0.5" stopColor="white" stopOpacity="0.6" />
								<stop offset="1" stopColor="white" stopOpacity="0" />
							</linearGradient>
						</defs>
						{iconPaths.sparkle}
						<g clipPath="url(#compare-star-shape)">
							<rect
								className={styles.starGlaze}
								x="-12"
								width="12"
								height="24"
								fill="url(#compare-star-glaze)"
							/>
						</g>
					</svg>
				</span>{' '}
				compared
			</h1>
			<p>
				Four ways to highlight code. Compare the browser footprint, the APIs, and the
				trade-offs that matter for your project.
			</p>
		</header>
		<section aria-labelledby="glance-title" data-intro>
			<h2 id="glance-title" className={styles.title}>
				At a glance
			</h2>
			<CompareTable label="Feature comparison">
				<table className={styles.table}>
					<LibraryHead />
					<tbody>
						<tr>
							<th scope="row">
								JavaScript → HTML
								<span className={styles.version}>KB, minified + gzip</span>
							</th>
							{libraries.map(library => (
								<td
									key={library.id}
									data-kirari={library.id === 'kirari' || undefined}
								>
									<strong className={styles.bundleSize}>
										{(library.gzipBytes / 1000).toFixed(1)} <small>KB</small>
									</strong>
									<span className={styles.barTrack} aria-hidden="true">
										<span
											className={styles.bar}
											style={
												{
													'--bar-scale':
														library.gzipBytes / largestBundle,
												} as CSSProperties
											}
										/>
									</span>
								</td>
							))}
						</tr>
						{features.map(feature => (
							<tr key={feature.label}>
								<th scope="row">{feature.label}</th>
								{feature.values.map((value, index) => (
									<td
										key={libraries[index]!.id}
										data-kirari={index === 0 || undefined}
									>
										<Value value={value} />
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</CompareTable>
		</section>
		<section aria-labelledby="streaming-title" className={styles.section} data-reveal>
			<h2 id="streaming-title" className={styles.title}>
				Streaming performance
			</h2>
			<p className={styles.lede}>
				Median time to highlight a JavaScript response arriving in 16-character chunks.
				Lower is better.
			</p>
			<CompareTable label="Streaming performance">
				<table className={styles.table}>
					<LibraryHead streaming />
					<tbody>
						{streamingResults.map(result => (
							<tr key={result.label}>
								<th scope="row">
									{result.label}
									<span className={styles.version}>{result.updates} updates</span>
								</th>
								{result.values.map((value, index) => (
									<td
										key={libraries[index]!.id}
										data-kirari={index === 0 || undefined}
										className={styles.timing}
									>
										{value}
									</td>
								))}
							</tr>
						))}
					</tbody>
				</table>
			</CompareTable>
		</section>
		<section aria-labelledby="alternatives-title" className={styles.section} data-reveal>
			<h2 id="alternatives-title" className={styles.title}>
				When to pick which
			</h2>
			<div className={styles.alternatives}>
				{alternatives.map(alternative => (
					<article
						key={alternative.id}
						className={styles.card}
						data-kirari={alternative.id === 'kirari' || undefined}
					>
						<p className={styles.cardLabel}>{names[alternative.id]}</p>
						<h3>{alternative.title}</h3>
						<p>{alternative.description}</p>
					</article>
				))}
			</div>
		</section>
		<section aria-labelledby="code-title" className={styles.section}>
			<h2 id="code-title" className={styles.title}>
				Same snippet, four ways
			</h2>
			<div className={styles.snippets}>
				{snippets.map(snippet => (
					<CodeBlock
						key={snippet.id}
						id={`compare-${snippet.id}`}
						label={names[snippet.id]!}
						text={snippet.code}
						html={highlight(snippet.code, {
							language: typescript,
						})}
						copyLabel={`Copy ${names[snippet.id]} example`}
					/>
				))}
			</div>
		</section>
		<div className={styles.actions}>
			<Button href={routes.docs} endIcon={<Icon name="arrow" size={16} />}>
				Get started
			</Button>
			<Button href={routes.playground} variant="secondary">
				Open playground
			</Button>
		</div>
	</main>
)
