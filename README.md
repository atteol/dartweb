# dartweb

## What's Dartweb
Dartweb is a project developed from pure boredom. It allows browsing content from certain Dartweb servers, while keeping the servers hidden behind one central server. This means the clients cannot see any information about a server except a pseudonymous owner name The central server will communicate with the requested server behind the scenes.

## How does Dartweb work?
Dartweb consists of clients, Dartweb servers and one central server. Dartweb can be accessed by browser or with the API that is included in the Nodejs library, so the library can act both as a client and a server. The central server validates requests from clients, sends it to the server that was requested and finally forwards the server's response back to the original client.

The central server stores **tokens** of all servers. When connecting a server to the network, the server sends its unique, secret token to the central server. The central server then verifies the server's authenticity. The token tells the central server essential information about the server about to be connected, like its **address**, **owner**, and **creation time**. The address of the server is fixed to the token, but the **server name** is given by the server every time it wants to connect to Dartweb. Therefore, server names can change, but they have a small role in the network anyway. While this is the way the default Dartweb central server works, you may find another Dartweb sub-network (with its own central server) with a different logic.

## How can I access Dartweb?
You can access the default (KantonDev) Dartweb network with your browser (GET): [https://dartweb.kantondev.org:9999/serveraddress/path/path2/etc](https://dartweb.kantondev.org:9999)
A server can deny browser requests. In this case, you are supposed to use that server via the Dartweb API (POST/json), accessible via the Dartweb Nodejs library. Read more about the library [here](https://github.com/botboi37/dartweb/blob/main/dartweb.md).

## How can I host a Dartweb server?
To host a server on the default (KantonDev) Dartweb network, you need a secret and unique server token. This enables us to approve and, later on, trust servers.
Request a token by email: [adde@kantondev.org](mailto:adde@kantondev.org). Include the address you would like to reserve for your server, and an identifiable server owner name (doesn't have to be your real name).
Then use the Dartweb Nodejs library to connect your server. Read more about the library [here](https://github.com/botboi37/dartweb/blob/main/dartweb.md).

## Can I host my own central server?
Even though the source code of the central server is available, it's not in the `require`able form of a Nodejs module since Dartweb's default central server is ran at [KantonDev Group's servers](https://github.com/kantondev). If you want though, you can host a central server yourself (by converting the server to a module or just running the source file with Node). This way you can customize how your own Dartweb sub-network works, add tokens for new servers yourself, etc.
But here's the downside of hosting a central server on your own: **all clients & servers need to be configured separately to access your network instead of the default network (KantonDev)**, so there might be less traffic on your Dartweb sub-network.