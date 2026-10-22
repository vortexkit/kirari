import styles from './ThemeCard.module.css'
import { highlight } from '@vortexlabs/kirari'
import { typescript } from '@vortexlabs/kirari/languages'
import { HighlightedCode } from '@/components/code/HighlightedCode'
import type * as Types from './ThemeCard.types'

const sample = `// a little light
const name = 'kirari'
shine(name, 42)`

export const ThemeCard = (props: Types.Props) => {
	const { theme } = props

	return (
		<figure className={styles.root} data-palette={theme.id}>
			<pre className="kirari">
				<HighlightedCode
					html={highlight(sample, {
						language: typescript,
					})}
				/>
			</pre>
			<figcaption>{theme.label}</figcaption>
		</figure>
	)
}
