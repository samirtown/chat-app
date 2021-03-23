const socket = io()

const $messageForm = document.querySelector('#message-form')
const $messageFormInput = $messageForm.querySelector('input')
const $messageFormButton = $messageForm.querySelector('button')
const $locationButton = document.querySelector('#send-location')
const $messages = document.querySelector('#messages')

// templates
const messageTemplate = document.querySelector('#message-template').innerHTML
const locationTemplate = document.querySelector('#location-template').innerHTML
const sidebarTemplate = document.querySelector('#sidebar-template').innerHTML

// Options
const {username, room} = Qs.parse(location.search, { ignoreQueryPrefix: true })

const autoscroll = () =>{
    // new message elements
    const $newMessage =  $messages.lastElementChild

    // height of the new message
    const newMessageStyles = getComputedStyle($newMessage)
    const newMessageMargin = parseInt(newMessageStyles.marginBottom)
    const newMessageHeight = $newMessage.offsetHeight + newMessageMargin
    const visibleHeight = $messages.offsetHeight

    // Height of messages container
    const containerHeight = $messages.scrollHeight

    //how far have I scrolled
    const scrollOffset = $messages.scrollTop + visibleHeight

    if(containerHeight - newMessageHeight <= scrollOffset){
        $messages.scrollTop = $messages.scrollHeight
    }
}

socket.on('message', (message) =>{
    const html = Mustache.render(messageTemplate, {
        username: message.username,
        message: message.text,
        createdAt: moment(message.createdAt).format('HH:mm')
    })
    $messages.insertAdjacentHTML('beforeend', html)
    autoscroll()
}) 

socket.on('locationMessage', (url) =>{
    const html = Mustache.render(locationTemplate, {
        username: url.username,
        url: url.url,
        createdAt: moment(url.createdAt).format('HH:mm')
    })
    $messages.insertAdjacentHTML('beforeend',html)
})  

socket.on('roomData', ({ room ,users }) =>{
    console.log(users)
    const html = Mustache.render(sidebarTemplate, {
        room,
        users
    })
    document.querySelector('#sidebar').innerHTML = html
    autoscroll()
})
 
// server emit = client receiver > acknowledgement server
// client emit = server receiver > acknoledgement client

//voor acknowledgement zijn changes op client en server nodig
// wie de event emit doet een callback function
// we de event received ontvangt een callback function dat het moet oproepen

$messageForm.addEventListener('submit', (e) =>{
    e.preventDefault()
    $messageFormButton.setAttribute('disabled', 'disabled')
    //disable form
    if(e.target.elements.message.value.length > 0){
        socket.emit('sendMessage', e.target.elements.message.value, (error) =>{
            $messageFormButton.removeAttribute('disabled')
            $messageFormInput.value = ''
            $messageFormInput.focus()
            // this is the acknowledgement
            // enable
            if(error){
                return console.log(error)
            }
            console.log('message was delivered')
        })
    }
})   


$locationButton.addEventListener('click', () =>{
    if(!navigator.geolocation){
        return alert('geolocation is not supported by your browser.')
    }
    $locationButton.setAttribute('disabled', 'disabled')
    navigator.geolocation.getCurrentPosition((position) =>{
        // last parameter, the function, is an acknowledgement
        socket.emit('sendLocation', {long: position.coords.longitude,
            lat: position.coords.latitude}, () =>{
                $locationButton.removeAttribute('disabled')
            }) 
    })
})

// de error is acknowledgement
socket.emit('join', {username, room}, (error) =>{
    if(error){
        alert(error)
        location.href = '/'
    }
})