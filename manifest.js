
const catExtra = {
    movie: [
        {
            name: 'genre',
            options: ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western']
        }
    ],
    series: [
        {
            name: 'genre',
            options: ['Action', 'Adventure', 'Animation', 'Biography', 'Comedy', 'Crime', 'Documentary', 'Drama', 'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Musical', 'Mystery', 'Romance', 'Sci-Fi', 'Sport', 'Thriller', 'War', 'Western']
        }
    ],
    other: [
        {
            name: 'genre',
            options: ['Action', 'Adventure', 'Comedy', 'Documentary', 'Drama', 'Family', 'Game-Show', 'Music', 'Mystery', 'News', 'Reality-TV', 'Romance', 'Sport', 'Talk-Show']
        }
    ]
}

Object.keys(catExtra).forEach(cat => { catExtra[cat].push({ name: 'skip' }) })

const searchCats = []

const types = ['movie', 'series']

types.forEach(cat => {
    searchCats.push({
        id: 'rpdb_' + cat + '_search',
        type: cat,
        name: 'Search',
        extra: [{ name: 'search', isRequired: true }]
    })
})

const defaultCats = {
	movie: ['New', 'Popular', 'Best'],
	series: ['New', 'Popular', 'Best'],
	other: ['New', 'Best'],
}

const manifestTemplate = {
    id: 'org.rpdb.addon',
    name: 'RPDB Catalogs',
    logo: 'https://1fe84bc728af-rpdb.baby-beamup.club/addon-logo.png',
    description: 'Catalogs to accurately track new / popular / best releases, and add ratings from all popular rating websites to posters. Based on the RatingPosterDB API.',
    resources: ['catalog'],
    types,
    idPrefixes: ['tt'],
    version: '1.0.0',
}

module.exports = {
	default: () => {
	  let catalogs = []

	  Object.keys(defaultCats).forEach(cat => {
        defaultCats[cat].forEach(catName => {
            catalogs.push({
                id: 'rpdb_'+cat+'_'+catName.toLowerCase(),
                type: cat,
                name: catName,
                extra: catExtra[cat]
            })
        })
	  })

	  catalogs = catalogs.concat(searchCats)

	  const manifest = Object.assign({}, manifestTemplate)

	  manifest.catalogs = catalogs

	  manifest.behaviorHints = {
		configurable: true,
		configurationRequired: true,
	  }

	  return manifest

	},
	configured: (rpdbApiKey, catalogChoices) => {
	  let tier

	  Array.from({length: 4}, (_, i) => i + 1).some(posTier => {
	    if (rpdbApiKey.startsWith('t' + posTier + '-')) {
	        tier = posTier
	        return true
	    }
	  })

	  const catChoices = (catalogChoices || '').split('_')

	  let catalogs = []

	  Object.keys(defaultCats).forEach(cat => {
	    if (catChoices.includes(cat))
	        defaultCats[cat].forEach(catName => {
	            catalogs.push({
	                id: 'rpdb_'+cat+'_'+catName.toLowerCase(),
	                type: cat,
	                name: catName,
	                extra: catExtra[cat]
	            })
	        })
	  })

	  if (catChoices.includes('search'))
	    catalogs = catalogs.concat(searchCats)

	  const manifest = Object.assign({}, manifestTemplate)

	  manifest.id = 'org.rpdb.'+(tier ? 'tier' + tier : 'tier0')

	  manifest.name = 'RPDB Catalogs' + (tier ? ' Tier ' + tier : '')

	  manifest.catalogs = catalogs

	  return manifest
	}
}