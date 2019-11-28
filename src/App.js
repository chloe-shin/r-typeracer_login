import React from "react";

import Clock from "./components/Clock";
import Footer from "./components/Footer";
import TextInput from "./components/TextInput";
import TextDisplay from "./components/TextDisplay";

require("./sass/app.scss");
require("./font-awesome/css/font-awesome.css");


class App extends React.Component {
  constructor(props) {
    super(props);
    const existingToken = sessionStorage.getItem("token");
    const accessToken =
      window.location.search.split("=")[0] === "?api_key"
        ? window.location.search.split("=")[1]
        : null;
 
    this.state = {
      token: existingToken || accessToken,
      user: null,
      wpm: 0,
      index: 0,
      value: "",
      error: false,
      errorCount: 0,
      timeElapsed: 0,
      lineView: false,
      startTime: null,
      completed: false,
      excerpt: ''
    };
  }

  async componentDidMount() {
    this.intervals = [];
    this.getExcerpts();
    this.getUserInfo();
    window.history.replaceState({}, document.title, "/");
    // this.setupCurrentUser();
  }

  getExcerpts = async () => {
    const response = await fetch(process.env.REACT_APP_URL+"/excerpts");
    const data = await response.json()
    if (response.ok) {
      console.log(data);
      const randomObject = this._randomElement(data.data)
      this.setState({ 
        excerptId:randomObject.id,
        excerpt: randomObject.body,
        excerpts:data.data })
    } else {
      this.setState({ error: "Could not load" });
    }
    console.log('data', data)
  };


  setupCurrentUser = () => {
    const existingToken = sessionStorage.getItem("token");
    const accessToken =
      window.location.search.split("=")[0] === "?api_key"
        ? window.location.search.split("=")[1]
        : null;
    if (!accessToken && !existingToken) {
      window.location.replace(process.env.REACT_APP_URL);
    }

    if (accessToken) {
      sessionStorage.setItem("token", accessToken);
    }
    this.setState({
      token: existingToken || accessToken
    });
  };

  setInterval() {
    this.intervals.push(setInterval.apply(null, arguments));
  }

  _randomElement = array => {
    return array[
      Math.floor(Math.random() * array.length)
    ];
  };

  _handleInputChange = e => {
    if (this.state.completed) return;

    let inputVal = e.target.value;
    let index = this.state.index;
    if (this.state.excerpt.slice(index, index + inputVal.length) === inputVal) {
      if (inputVal.slice(-1) === " " && !this.state.error) {
        this.setState({
          value: "",
          index: this.state.index + inputVal.length
        });
      } else if (index + inputVal.length === this.state.excerpt.length) {
        this.setState(
          {
            value: "",
            completed: true
          },
          this._calculateWPM
        );

        this.intervals.map(clearInterval);
      } else {
        this.setState({
          error: false,
          value: inputVal
        });
      }
    } else {
      this.setState({
        error: true,
        value: inputVal,
        errorCount: this.state.error
          ? this.state.errorCount
          : this.state.errorCount + 1
      });
    }
  };

  _changeView = e => {
    this.setState({ lineView: !this.state.lineView });
  };

  _restartGame = () => {
    this.setState(
      {
        wpm: 0,
        index: 0,
        value: "",
        error: false,
        errorCount: 0,
        timeElapsed: 0,
        lineView: false,
        startTime: null,
        completed: false,
        result: null,
        excerpt: this._randomElement(this.state.excerpts) 
      },
      () => this.intervals.map(clearInterval)
    );
  };

  _setupIntervals = () => {
    this.setState(
      {
        startTime: new Date().getTime()
      },
      () => {
        this.setInterval(() => {
          this.setState({
            timeElapsed: new Date().getTime() - this.state.startTime
          });
        }, 50);
        this.setInterval(this._calculateWPM, 1000);
      }
    );
  };

  //backend endpoint
  async getUserInfo(){
    const res = await fetch(process.env.REACT_APP_URL+"/getuser", {
      headers:{
        "Content-Type": "application/json",
        "Authorization": `Token ${this.state.token}`
      }
    }) 
    if (res.ok){
      const data = await res.json()
      console.log('data', data)
      console.log(res,'res')
      sessionStorage.setItem('token', this.state.token)
      this.setState({user: data})
    }
    else {
      sessionStorage.clear('token')
      this.setState({user: null})
    }
  }

  postScore = async (wpm, elapsed) => {
    const resp = await fetch(process.env.REACT_APP_URL+"/scores", {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token ${this.state.token}`
      },
      body: JSON.stringify({
        id : this.state.excerptId,
        wpm,
        time: elapsed,
        errorCount: this.state.errorCount
      })
    });
    const data = await resp.json();
    if (resp.ok) {
      this.setState({ result: data })
    } else {
      this.setState({ error: "Could not post score" });
    }
  };

  _calculateWPM = () => {
    const elapsed = new Date().getTime() - this.state.startTime;
    let wpm;
    if (this.state.completed) {
      // finnish the gameeeeee
      wpm = (this.state.excerpt.split(" ").length / (elapsed / 1000)) * 60;
      this.postScore(wpm, elapsed);
    } else {
      let words = this.state.excerpt.slice(0, this.state.index).split(" ")
        .length;
      wpm = (words / (elapsed / 1000)) * 60;
    }
    this.setState({
      wpm: this.state.completed ? Math.round(wpm * 10) / 10 : Math.round(wpm)
    });
  };

  renderGame = () => {
    const excerpt =  this.state.result ? this.state.result.excerpt : null
    return (
      <>
        <TextDisplay
          index={this.state.index}
          error={this.state.error}
          lineView={this.state.lineView}
        >
          {this.state.excerpt}
        </TextDisplay>
        <TextInput
          error={this.state.error}
          value={this.state.value}
          started={!!this.state.startTime}
          setupIntervals={this._setupIntervals}
          onInputChange={this._handleInputChange}
        />
        <div>
          {excerpt && 
          <>
            <small> {excerpt.body} </small>
            have  {excerpt.scores.count} scores, and the top 3 are:
        {excerpt.scores.top.map(score => {
              return <li> score:  {score.wpm}</li>
            })}
          </>
          }

        </div>
        <div className={this.state.completed ? "stats completed" : "stats"}>
          <Clock elapsed={this.state.timeElapsed} />
          <span className="wpm">{this.state.wpm}</span>
          <span className="errors">{this.state.errorCount}</span>
        </div>
      </>
    )
  }

  renderSignin = () => {
    return (
      <div className="signin">
        <h1>Please Sign In</h1>
        <input
          autoFocus
          placeholder="Email"
        />
        <input
        />
      </div>
    )
  }

  render() {
    console.log("token", this.state.token)
    return (
      <>
        <div className="header">
          <h1>Type Racing</h1><br/>
          <i onClick={this._restartGame} className="fa fa-lg fa-refresh"></i>
          <i className="fa fa-lg fa-bars" onClick={this._changeView}></i>
          {this.state.user ? (
            <button onClick={()=>window.location.replace(process.env.REACT_APP_URL+'/logout')}> <div>Sign Out</div></button>
          ) : (
            <button onClick={()=>window.location.replace(process.env.REACT_APP_URL+'/login/facebook')}> <div> Sign In</div> </button>
            )}
        </div>
        {this.state.user ? this.renderGame() : this.renderSignin()}

        <Footer />
      </>
    );
  }
}

export default App;
