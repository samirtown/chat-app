const path = require('path')
const http = require('http')
const express = require('express')
const socketio = require('socket.io')
const Filter = require('bad-words')
const { generateMessage, generateLocationMessage }= require('./utils/messages')
const { addUser, removeUser, getUsersInRoom, getUser} = require('./utils/users')

const app = express()
const server = http.createServer(app)
const io = socketio(server)

const port = process.env.PORT
const publicDirectoryPath = path.join(__dirname, '../public')

app.use(express.static(publicDirectoryPath))

let count = 0
const welcomeMessage = "Welcome new user"

//server emmit count updated naar de client
//client luistered en logged de data
//wanneer de client emmit door button spreek server aan
//server returned naar alle clients ( io.emit) de nieuwe count
io.on('connection', (socket) =>{
    console.log('new websocket connection')

    socket.on('join', ({username, room}, callback) => {
        const { error, user } = addUser({ id: socket.id, username, room })

        if (error) {
            return callback(error)
        }

        socket.join(user.room)
         //naar de client die het oproept
        socket.emit('message', generateMessage('Admin', 'Welcome'))
        //naar alle clients behalve de client die het oproept
        socket.broadcast.to(user.room).emit('message', generateMessage('Admin', `${user.username} has joined!`))
        io.to(user.room).emit('roomData', {
            room: user.room,
            users: getUsersInRoom(user.room)
        })
        //letting the client know join went well, acknowledgement
        callback()
        // socket.emit, io.emit, socket.broadcast.emit

        //io.to.emit, socket.broadcast.to.emit << naar specifieke room
    })

    //callback voor acknowledgement
    socket.on('sendMessage', (message, callback) =>{
        const filter = new Filter()
        const user = getUser(socket.id)
        if (filter.isProfane(message)){
            return callback('Profanity is not allowed')
        }
        //naar iedereen
        io.to(user.room).emit('message', generateMessage(user.username,message))
        callback()
    })

    socket.on('disconnect', () =>{
        const user = removeUser(socket.id)

        if (user) {
            io.to(user.room).emit('message', generateMessage('Admin', `${user.username}has left the room`))
            io.to(user.room).emit('roomData', {
                room: user.room,
                users: getUsersInRoom(user.room)
            })
        }
    })
    socket.on('sendLocation', (location, callback) =>{
        const user = getUser(socket.id)
        io.emit('locationMessage', generateLocationMessage(user.username,'https://google.com/maps?q=' + location.lat.toString() + ',' + location.long.toString())
        )
        callback()
    })   
    // //om het naar de client te sturen.
    // socket.emit('countUpdated', count)
    // //om naar client( te luisteren
    // socket.on('increment', () =>{
    //     count++
    //     //socket.emit('countUpdated', count)
    //     // om naar meerdere clients te sturen
    //     io.emit('countUpdated', count)
    // })
})

server.listen(port, () =>{
    console.log("server is up on port " + port)
})
