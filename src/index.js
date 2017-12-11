const icon = require('icon.png');
const commands = require('./commands');

commands.initialize();

export const settings = {
  key: { type: 'string', defaultValue: '' }
};

const keyword = 'ifttt';
const triggerPreamble = `${keyword} trigger `;
const registerPreamble = `${keyword} register `;
const deletePreamble = `${keyword} delete `;
const clearPreamble = `${keyword} clear`;


export const fn = (props) => {
  if(checkForKey(props)) {
    processCustomCommands(props);
    processHelperCommands(props);
    processBuiltinCommands(props);
  }
}

function checkForKey({ term, settings, display, actions }) {
  if (!settings.key && (keyword.startsWith(term) || term.startsWith(keyword))) {
    display({
      icon,
      title: 'IFTTT: Please Add Key from Service to Plugin Settings',
      subtitle: 'Press [Enter] to go to Setup Instructions and [Tab] to go to plugin settings',
      term: 'plugins ifttt',
      onSelect: () => actions.open('https://github.com/codingmatty/cerebro-plugin-ifttt/blob/master/docs/setup.md')
    });
  }

  return !!settings.key;
}

function processCustomCommands({ term, display, settings = {} }) {
  // Search for exact commands and display with action
  const exactMatchedCommands = commands.search(term.split(' ')[0], { exact: true });
  if (exactMatchedCommands.length) {
    display(
      exactMatchedCommands.map(({ eventName, slug, description }) => {
        const [value1, value2, value3] = term.split(' ').slice(1);

        return ({
          icon,
          id: slug,
          title: `Trigger '${eventName}'`,
          subtitle: description,
          getPreview: () => renderPreview({ eventName, value1, value2, value3 }),
          onSelect: () => {
            sendEvent(eventName, settings.key, { value1, value2, value3 });
          }
        })
      })
    );
  }

  // Now search for incomplete commands and display with autocomplete and action
  const matchedCommands = commands.search(term).filter((command) => {
    return !exactMatchedCommands.map(({ slug }) => slug).includes(command.slug);
  });
  if (matchedCommands.length) {
    display(
      matchedCommands.map(({ eventName, slug, description }) => ({
        icon,
        id: slug,
        title: `Trigger '${eventName}'`,
        subtitle: description,
        term: `${slug} `,
        onSelect: () => {
          sendEvent(eventName, settings.key);
        }
      }))
    );
  }
}


function processHelperCommands({ term, display }) {
  if (triggerPreamble.startsWith(term) && triggerPreamble !== term) {
    display({
      icon,
      title: `IFTTT: Trigger Event`,
      term: triggerPreamble
    });
  }

  if (registerPreamble.startsWith(term) && registerPreamble !== term) {
    display({
      icon,
      title: `IFTTT: Register Command Alias for Event Trigger`,
      term: registerPreamble
    });
  }

  if (deletePreamble.startsWith(term) && deletePreamble !== term) {
    display({
      icon,
      title: `IFTTT: Delete Command Alias for Event Trigger`,
      term: deletePreamble
    });
  }

  if (clearPreamble.startsWith(term)) {
    display({
      icon,
      title: `IFTTT: Clear Registered Command Aliases`,
      term: clearPreamble,
      onSelect: () => {
        commands.clear();
      }
    });
  }
}


function processBuiltinCommands({ term, display, settings = {} }) {
  // Now display the help to run whatever built in IFTTT command was chosen
  if (term.startsWith(triggerPreamble)) {
    // Trigger an IFTTT Event
    const [eventName, value1, value2, value3] = term.split(' ').slice(2);

    if (eventName) {
      const title = `Trigger '${eventName}'`;

      display({
        icon,
        title,
        getPreview: () => renderPreview({ eventName, value1, value2, value3 }),
        onSelect: () => {
          sendEvent(eventName, settings.key, { value1, value2, value3 });
        }
      });
    } else {
      display({
        icon,
        title: 'Enter an Event to Trigger',
        subtitle: 'ifttt trigger <command> [<value1>] [<value2>] [<value3>]'
      });
    }
  } else if (term.startsWith(registerPreamble)) {
    // Register a command alias for an IFTTT Webhook Event
    const [slug, eventName, ...rest] = term.split(' ').slice(2);
    const description = rest.join(' ');

    if (slug && eventName) {
      const [existingCommand] = commands.search(slug, { exact: true });

      const title = existingCommand
        ? `Overwrite command alias '${slug}' with event '${eventName}'`
        : `Register command alias '${slug}' with event '${eventName}'`;

      display({
        icon,
        title,
        subtitle: description && `Description: ${description}`,
        onSelect: () => {
          commands.register({ eventName, slug, description });
        }
      });
    } else {
      display({
        icon,
        title: 'Enter a Command Alias and Event to Register',
        subtitle: 'ifttt register <command> <event> [<description>]'
      });
    }
  } else if (term.startsWith(deletePreamble)) {
    // Delete a command alias for an IFTTT Webhook Event
    const [slug] = term.split(' ').slice(2);

    if (slug) {
      const [existingCommand] = commands.search(slug, { exact: true });

      const title = existingCommand
        ? `Delete command alias '${slug}' with event '${existingCommand.eventName}'`
        : `No such command alias exists for '${slug}`;

      display({
        icon,
        title,
        onSelect: () => commands.unregister(slug)
      });
    } else {
      display({ icon, title: 'Enter a Registered Command Alias to Delete for IFTTT' });
    }
  }
}

function renderPreview({ eventName, value1, value2, value3 }) {
  return (
    value1 ?
    <ul style={{ listStyle: 'none', padding: 0 }}>
      <li style={{ marginBottom: 10 }}>Event: <pre style={{ display: 'inline' }}>{eventName}</pre></li>
      <li style={{ marginBottom: 10 }}>Data:</li>
      <li><pre style={{ display: 'inline' }}>value1</pre>: {value1}</li>
      {value2 && <li><pre style={{ display: 'inline' }}>value2</pre>: {value2}</li>}
      {value3 && <li><pre style={{ display: 'inline' }}>value3</pre>: {value3}</li>}
    </ul>
    : null
  )
}

function sendEvent(eventName, key, args) {
  fetch(`https://maker.ifttt.com/trigger/${eventName}/with/key/${key}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json'
    },
    body: JSON.stringify(args)
  })
    .then((response) => {
      if (response.status > 400) {
        return response.json().then((response) => Promise.reject(response));
      }
      return response.text()
    })
    .then((response) => new Notification(`Event '${eventName}' Triggered`, { icon }))
    .catch(({ errors: [{ message }] }) =>
      new Notification(`Event '${eventName}' Trigger Failed`, {
        body: message,
        icon
      })
    );
}
