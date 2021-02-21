const express = require('express')
const needle = require('needle')
const namedQueue = require('named-queue')
const qs = require('querystring')
const path = require('path')

const cors = require('cors')
const addon = express()

addon.use(cors())

addon.use(express.static('public'))

let listCache

let lastUpdate = 0

const shouldUpdate = 1 * 60 * 60 * 1000 // 1h

const manifest = require('./manifest')

addon.get('/manifest.json', function (req, res) {
    res.send(manifest.default())
})

addon.get('/:rpdbApiKey/:posterType/:catalogChoices/manifest.json', function (req, res) {
    res.send(manifest.configured(req.params.rpdbApiKey, req.params.catalogChoices))
})

const updateCache = new namedQueue((task, cb) => {
    needle.get('https://api.ratingposterdb.com/' + task.rpdbApiKey + '/releases?break=' + Date.now(), (err, resp, body) => {
        if ((body || {}).movie)
            listCache = body
        cb()
    })
}, 1)

const limit = 100

function catalogs(req, res) {
    const idParts = req.params.id.split('_')
    const lstType = idParts[1]
    const catType = idParts[2]
    const extra = req.params.extra ? qs.parse(req.url.split('/').pop().slice(0, -5)) : {}
    const skip = extra.skip || 0
    const genre = extra.genre

    if (extra.search) {
        needle.get('https://v3-cinemeta.strem.io/catalog/' + lstType + '/top/search=' + extra.search + '.json', (err, resp, body) => {
            if (((body || {}).metas || []).length) {
                res.send({
                    metas: body.metas.map(el => {
                        el.poster = 'https://api.ratingposterdb.com/' + req.params.rpdbApiKey + '/imdb/' + req.params.posterType + '/' + el.id + '.jpg?fallback=true'
                        return el
                    })
                })
            } else 
                res.send({ metas: [] })
        })
        return
    }

    function handle() {
        if (!listCache) {
            res.send({ metas: [] })
            return
        }
        const realType = req.params.type == 'other' ? 'series' : req.params.type

        const listClone = Object.assign({}, listCache)

        let metas = (listClone.lists[lstType][catType] || []).map(el => {
            if (!listClone[realType][el])
                return null

            const obj = listClone[realType][el]

            if (obj.havePoster)
                obj.poster = 'https://api.ratingposterdb.com/' + req.params.rpdbApiKey + '/imdb/' + req.params.posterType + '/' + obj.id + '.jpg?fallback=true'

            let extraRatings = ''

            if (obj.mcRating) {
                extraRatings += 'MC: ' + obj.mcRating + '%'
                delete obj.mcRating
            }

            if (obj.rtRating) {
                if (extraRatings)
                    extraRatings += ' / '
                extraRatings += 'RT: ' + obj.rtRating + '%'
                delete obj.rtRating
            }

            if (extraRatings) {
                if (obj.description)
                    obj.description += ' \n\n' + extraRatings
                else
                    obj.description = extraRatings
            }

            obj.imdb_id = obj.id

            return obj
        }).filter(el => !!el)

        if (genre)
            metas = metas.filter(el => (el.genres || []).includes(genre))

        res.send({ metas: metas.slice(skip, skip + limit) })
    }

    if (!listCache || lastUpdate < Date.now() - shouldUpdate) {
        lastUpdate = Date.now()
        updateCache.push({ id: 'update', rpdbApiKey: req.params.rpdbApiKey }, handle)
    } else
        handle()
}

// settings page
addon.get('/configure', (req, res) => {
    res.sendFile(path.join(__dirname, 'configure.html'))
})

addon.get('/:rpdbApiKey/:posterType/:catalogChoices/catalog/:type/:id/:extra?.json', catalogs)

const port = process.env.PORT || 7000

addon.listen(port, function() {
  console.log('Addon running on port ' + port)
})
