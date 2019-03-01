=======
Aliases
=======

You can crate own aliases by adding them into `~/.bashrc` file.

Containers aliases
------------------

Run this **outside** of docker containers:

..  code-block:: bash

    echo 'alias bcr="bin/containers run"' >> ~/.bashrc
    echo 'alias bcc="bin/containers connect"' >> ~/.bashrc

Will write two aliases ``bcr`` and ``bcc`` into ``.bashrc``.
To apply changes run:

..  code-block:: bash

    . ~/.bashrc

Now you can use ``bcc`` instead of ``bin/containers connect``.

Refresh npm packages
--------------------

The easiest way to update npm packages is to run a set of commands:

..  code-block:: bash

    rm -rf node_modules/*
    git checkout package-lock.json
    npm i --unsafe-perm

This set can be converted into an alias. Run this **inside** the docker container:

..  code-block:: bash

    echo 'alias refresh="rm -rf node_modules/*; git checkout package-lock.json; npm i --unsafe-perm"' >> ~/.bashrc

and apply changes:

..  code-block:: bash

    . ~/.bashrc

Now ``refresh`` command will update packages.
