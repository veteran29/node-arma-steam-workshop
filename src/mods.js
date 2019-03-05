var async = require('async')
var path = require('path')

var readAcf = require('./acf/read')
var SteamWorkshop = require('steam-workshop')

var steamWorkshop = new SteamWorkshop()

function fetchMods (ids, callback) {
  steamWorkshop.getPublishedFileDetails(ids, callback)
}

function getModsFromACF (acf) {
  var mods = {}

  var installed = acf.AppWorkshop.WorkshopItemsInstalled
  var details = acf.AppWorkshop.WorkshopItemDetails

  for (var id in installed) {
    mods[id] = installed[id]
  }

  for (var id in details) {
    mods[id] = details[id]
  }

  return { installed: installed, all: mods }
}

module.exports = function (steamDirectory, currentDownloads, callback) {
  readAcf(steamDirectory, function (err, acf) {
    if (err) {
      return callback(err)
    }

    var acfMods = getModsFromACF(acf)
    var ids = Object.keys(acfMods.all)

    Object.keys(currentDownloads).forEach(function (id) {
      if (ids.indexOf(id) === -1) {
        ids.push(id)
      }
    })

    fetchMods(ids, function (err, mods) {
      if (err) {
        return callback(err)
      }

      callback(null, mods.map(function (mod) {
        if (!mod) {
          return
        }

        var id = mod.publishedfileid
        var downloading = currentDownloads[id] === true
        var folder = path.join(steamDirectory, 'steamapps', 'workshop', 'content', '107410', id)
        var title = mod.title

        var acfMod = acfMods.all[id]
        var partial = false
        var outdated = false
        var installed = false

        if (acfMod) {
          partial = acfMod.BytesToDownload > 0
          outdated = mod.time_updated > acfMod.timeupdated
          installed = !!acfMods.installed[id]
        }

        var needsUpdate = downloading || outdated || partial

        return {
          downloading: downloading,
          id: id,
          name: title || id,
          needsUpdate: needsUpdate,
          path: folder,
          installed: installed
        }
      }).filter(function (mod) {
        return mod && mod.id && mod.name && mod.path
      }).sort(function (a, b) {
        return a.name.localeCompare(b.name)
      }))
    })
  })
}
