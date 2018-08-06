/**
 * React Native Email Link
 *
 * This file supports both iOS and Android.
 */

import { Platform, Alert, ActionSheetIOS, Linking } from 'react-native'

class EmailException {
  constructor (message) {
    this.message = message
    this.name = 'EmailException'
  }
}

const prefixes = {
  'apple-mail': 'message://',
  'gmail': 'googlegmail://',
  'inbox': 'inbox-gmail://',
  'spark': 'readdle-spark://',
  'airmail': 'airmail://',
  'outlook': 'ms-outlook://'
}

const titles = {
  'apple-mail': 'Mail',
  'gmail': 'Gmail',
  'inbox': 'Inbox',
  'spark': 'Spark',
  'airmail': 'Airmail',
  'outlook' : 'Outlook'
}

/**
 * Check if a given mail app is installed.
 *
 * @param {string} app
 * @returns {Promise<boolean>}
 */
export function isAppInstalled (app) {
  return new Promise((resolve) => {
    if (!(app in prefixes)) {
      return resolve(false)
    }

    Linking.canOpenURL(prefixes[app])
      .then((isSupported) => {
        resolve(isSupported)
      })
      .catch(() => resolve(false))
  })
}

/**
 * Ask the user to choose one of the available mail apps.
 * @param title
 * @param message
 * @param cancelLabel
 * @returns {Promise<String|null>}
 */
export function askAppChoice (
  title = 'Open mail app',
  message = 'Which app would you like to open?',
  cancelLabel = 'Cancel',
) {
  return new Promise(async (resolve) => {
    let availableApps = []
    for (let app in prefixes) {
      let avail = await isAppInstalled(app)
      if (avail) {
        availableApps.push(app)
      }
    }
    if (availableApps.length < 2) {
      return resolve(availableApps[0] || null)
    }

    if (isIOS) {
      let options = availableApps.map((app) => titles[app])
      options.push(cancelLabel)

      ActionSheetIOS.showActionSheetWithOptions({
        title: title,
        message: message,
        options: options,
        cancelButtonIndex: options.length - 1
      }, (buttonIndex) => {
        if (buttonIndex === options.length - 1) {
          return resolve(null)
        }
        return resolve(availableApps[buttonIndex])
      })

      return
    }

    let options = availableApps.map((app) => ({text: titles[app], onPress: () => resolve(app)}))
    options.push({text: cancelLabel, onPress: () => resolve(null), style: 'cancel'})
    Alert.alert(
      title,
      message,
      options,
      {onDismiss: () => resolve(null)}
    )
  })
}

/**
 * Open an email app, or let the user choose what app to open.
 *
 * @param {{
 *     app: string | undefined | null,
 *     title: string,
 *     message: string,
 *     cancelLabel: string,
 * }} options
 */
export async function openInbox (options = {}) {
  if (!options || typeof options !== 'object') {
    throw new EmailException('First parameter of `openInbox` should contain object with options.')
  }

  if (Platform.OS === 'android') {
    // We can't pre-choose, since we use native intents
    if (!('Email' in NativeModules)) {
      throw new EmailException('NativeModules.Email does not exist. Check if you installed the Android dependencies correctly.')
    }

    NativeModules.Email.open()
    return
  }

  if ('app' in options && options.app && Object.keys(prefixes).indexOf(options.app) < 0) {
    throw new EmailException('Option `app` should be undefined, null, or one of the following: "' + Object.keys(prefixes).join('", "') + '".')
  }
  
  let app = options.app && options.app.length ? options.app : null
  if (!app) {
    const { title, message, cancelLabel } = options;
    app = await askAppChoice(title, message, cancelLabel)
  }

  return Linking.openURL(prefixes[app])
}
