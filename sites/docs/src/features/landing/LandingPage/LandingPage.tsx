import { highlight } from '@vortexlabs/kirari'
import { css, typescript } from '@vortexlabs/kirari/languages'
import { languageEntries } from '@/lib/languages'
import { docsPath, routes } from '@/lib/navigation'
import { site } from '@/lib/site'
import { theme, themes } from '@/lib/themes'
import { Button } from '@/components/ui/Button'
import { CodeBlock } from '@/components/code/CodeBlock'
import { FeatureIntro } from '@/features/landing/FeatureIntro'
import { Footer } from '@/components/layout/Footer'
import { HighlightDemo } from '@/features/landing/HighlightDemo'
import { Icon } from '@/components/ui/Icon'
import { InstallCommand } from '@/components/code/InstallCommand'
import { LanguageCloud } from '@/features/landing/LanguageCloud'
import { SiteLayout } from '@/components/layout/SiteLayout'
import { Stat } from '@/features/landing/Stat'
import { StreamDemo } from '@/features/landing/StreamDemo'
import { ThemeCard } from '@/components/code/ThemeCard'

const demoLanguages = [
	'typescript',
	'python',
	'rust',
	'css',
] as const
const palettes = [
	'ad-astra-dark',
	'daylight',
	'github-dark',
	'dracula',
	'nord',
	'catppuccin-latte',
	'tokyo-night',
	'rose-pine-dawn',
].map(id => {
	const entry = theme(id)
	return {
		id: entry.id,
		label: entry.label,
	}
})
const cards = [
	'dusk',
	'github-light',
	'catppuccin-mocha',
	'solarized-light',
].map(theme)
const themeCSS = `@import '@vortexlabs/kirari/themes/github-light.css';

/* Then tweak any token you like */
.my-code {
  --kirari-keyword: #7a3fd1;
}`
const quickStart = `import { highlight } from '@vortexlabs/kirari'
import '@vortexlabs/kirari/theme.css'

const html = highlight('const answer = 42')`
const languageCount = languageEntries.length

export const LandingPage = () => {
	const demos = demoLanguages.map(id => {
		const entry = languageEntries.find(item => item.id === id)!
		return {
			id: entry.id,
			filename: entry.filename,
			html: highlight(entry.sample, {
				language: entry.language,
			}),
		}
	})

	return (
		<SiteLayout page="home">
			<main id="main" tabIndex={-1} className="landing">
				<section className="hero" aria-labelledby="hero-title" data-intro="stagger">
					<h1 id="hero-title" className="hero-title">
						Syntax highlighting with a little <span className="glint-text">light</span>
					</h1>
					<p className="hero-lede">
						Kirari is a tiny, DOM-free highlighter for {languageCount}&nbsp;languages.
						Every token becomes a class, and your CSS picks the colors.
					</p>
					<div className="hero-cta">
						<InstallCommand id="hero-install" />
						<Button
							href={routes.docs}
							size="lg"
							endIcon={<Icon name="arrow" size={16} />}
						>
							Get started
						</Button>
					</div>
				</section>
				<div data-intro="delayed">
					<HighlightDemo demos={demos} palettes={palettes} />
				</div>
				<section className="stats" aria-label="At a glance" data-reveal="stagger">
					<Stat
						value={(site.javascriptHighlightGzipBytes / 1000).toFixed(1)}
						unit="KB"
						label="JavaScript highlighting, gzipped"
					/>
					<Stat
						value={String(languageCount)}
						unit=""
						label="languages, imported one by one"
					/>
					<Stat value="0" unit="" label="runtime dependencies or DOM APIs" />
				</section>
				<section className="row" aria-labelledby="stream-title" data-reveal="stagger">
					<FeatureIntro
						id="stream-title"
						icon="bolt"
						eyebrow="Streaming"
						title="Colors that keep up with the text"
						description="Feed chunks as they arrive from a model or a socket. Each write returns a patch for the tail that changed, so you re-render only that, not the whole block."
						href={docsPath('streaming')}
						linkLabel="How streaming works"
					/>
					<StreamDemo />
				</section>
				<section
					className="row reverse"
					aria-labelledby="themes-title"
					data-reveal="stagger"
				>
					<FeatureIntro
						id="themes-title"
						icon="palette"
						eyebrow="Theming"
						title={`${themes.length} themes in the box`}
						description="GitHub, Dracula, Nord, Catppuccin, Tokyo Night and more, each one CSS file. Each token type maps to one CSS variable, so you can tweak a theme or write your own without re-highlighting."
						href={docsPath('themes')}
						linkLabel="Browse all themes"
					/>
					<div className="theme-stack">
						{cards.map(entry => (
							<ThemeCard key={entry.id} theme={entry} />
						))}
						<CodeBlock
							id="theme-snippet"
							label="CSS"
							text={themeCSS}
							html={highlight(themeCSS, {
								language: css,
							})}
						/>
					</div>
				</section>
				<section className="row" aria-labelledby="languages-title" data-reveal="stagger">
					<FeatureIntro
						id="languages-title"
						icon="feather"
						eyebrow="Languages"
						title={`${languageCount} languages. Ship only yours.`}
						description={`Every grammar is its own import, so a blog with three languages never carries the other ${languageCount - 3}. Pick one to try it in the playground.`}
						href={docsPath('languages')}
						linkLabel="All languages"
					/>
					<LanguageCloud
						label="Try a language"
						links={languageEntries.map(entry => ({
							id: entry.id,
							label: entry.label,
							href: `${routes.playground}?lang=${entry.id}`,
						}))}
					/>
				</section>
				<section className="closing" aria-labelledby="closing-title" data-reveal="stagger">
					<div className="closing-copy">
						<h2 id="closing-title">Three lines to start</h2>
						<p>Install, import a theme, and highlight.</p>
						<div className="closing-actions">
							<Button
								href={`${routes.docs}#installation`}
								endIcon={<Icon name="arrow" size={16} />}
							>
								Installation guide
							</Button>
							<Button href={routes.playground} variant="secondary">
								Open playground
							</Button>
						</div>
					</div>
					<div className="closing-code" data-palette="dusk">
						<CodeBlock
							elevated
							id="quick-start"
							label="TypeScript"
							text={quickStart}
							html={highlight(quickStart, {
								language: typescript,
							})}
						/>
					</div>
				</section>
			</main>
			<Footer />
		</SiteLayout>
	)
}
