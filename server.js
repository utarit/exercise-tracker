const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI)

app.use(cors())

app.use(bodyParser.urlencoded({extended: false}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//MONGOOSE SCHEMA
const UserSchema = new mongoose.Schema({
  username: String,
  user_id: {type: String, default: ''},
  exercises: [
    {description: {type: String, default: ''},
     duration: Number,
     date: {type: Date, default: Date.now}
    }
  ]
})

const User = mongoose.model('User', UserSchema)

//ROUTES

app.post('/api/exercise/new-user', (req, res) => {
  
  const username = req.body.username
  if (username) {
    User.create({username: username}, (err, user)=>{
      if(err) {res.send(err)} else {
       user.user_id = (user._id).toString().substr(-6, 6);
        user.save((err, updatedUser)=>{
          const newUser = {
            username: updatedUser.username,
            user_id: updatedUser.user_id
          }
          res.send(newUser)
        });
      }
    })
    
  } else {
    
  res.send("You must write something!")
    
  }
})

app.post("/api/exercise/add", (req, res) => {
const content = req.body

  content.date =  new Date(content.date)

  User.findOne({user_id: content.user_id}, (err, user) => {
    if(err) {
      res.send(err)
    } else {
      if(user) {
      user.exercises.push(content)
      user.save()
      res.send("Log Added")
      } else {
        res.send("No user found")
      }
    }
  })
})

app.get("/api/exercise/log", (req, res) => {
  const query = req.query
  const fromDate = query.from ? new Date(query.from) : new Date("1900-01-01")
  const toDate = query.to ? new Date(query.to) : Date.now()
  const limit = query.limit ? Number(query.limit) : Number.MAX_SAFE_INTEGER
  
  User.findOne({user_id: query.userId}, (err, user)=>{
    if(err) {
    res.send("There is an error. Sorry. Blame Murphy Rules")
  } else { 
   if(user) {
     const userInfo = {username: user.username}
     const exercises = user.exercises.map(
       (exercise)=> {
        return {duration: exercise.duration, 
                description: exercise.description,
                date: exercise.date
               } 
       })
       
     const filteredExercises = exercises.filter(
       (exercise) => exercise.date >= fromDate && exercise.date <= toDate
     )
     
     const dateFormatted = filteredExercises.map(
       (exercise)=> {
        return {duration: exercise.duration, 
                description: exercise.description,
                date: exercise.date.toDateString()
               } 
       })
     
     
     userInfo.exercises = dateFormatted.slice(0, limit)
     res.send(userInfo)
     
   } else {
      res.send("You did something wrong") 
   }
  }
  })
  
})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
