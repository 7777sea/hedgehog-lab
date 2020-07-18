import React, { Component } from 'react';
import { ControlledEditor } from '@monaco-editor/react';

import {
  TextareaAutosize,
  Grid,
  Container,
  Button,
  Box,
  Typography,
  AppBar,
  Toolbar,
  Card,
  CardHeader,
  CardContent,
  Link,
  CircularProgress
} from '@material-ui/core';

import Output from './components/Output';

import { tutorials } from './tutorials';
import transpilerCore from './core/transpiler/transpiler-core';
import { executeOutput } from './core/runtime';

import CompiledWorker from './core/webWorkers/compiled.worker'
import OutputWorker from './core/webWorkers/output.worker'
import OutputItem from "./core/output/output-item";

const myCompiledWorker = new CompiledWorker()
const myOutputWorker = new OutputWorker()

// the default source for user's input
const DEFAULT_SOURCE = `//write your code here
print("hello world")
`;

function transpile(source) {
  const transpiled = transpilerCore(source);
  return transpiled;
}

class HedgehogLab extends Component {
  constructor(props) {
    super(props);
    this.state = {
      source: DEFAULT_SOURCE,
      compiled_code: '',
      execution_output_string: '',
      execution_output_list: [],
      auto_mode: true,
      loading: false,
    };
    this.handleCompileAndRun = this.handleCompileAndRun.bind(this);
  }

  componentDidMount() {
    myCompiledWorker.onmessage = (m) => {
      if (m.data.status === 'success') {
        this.setState({ compiled_code: m.data.result });
        myOutputWorker.postMessage(m.data.result)
      } else if (m.data.status === 'error') {
        this.setState({ execution_output_string: "Exception caught by Babel compiler:\n\n" + m.data.errorMsg, loading: false });
      }
    };
    myOutputWorker.onmessage = (m) => {
      // todo 虽然开启了webworker，但是在收到数据的瞬间会卡顿，原因未知，待优化 something make web worker stuck when message comeback, I don't know why, please fix
      if (m.data.status === 'success') {
        // webworker传递过来的对象是纯对象，并不是OutputItem的实例，改变原型链，让其继承OutputItem的属性
        const outPutItemPrototype = Object.create(new OutputItem())
        const output_list = m.data.result.map(item => {
          item.__proto__ = outPutItemPrototype
          return item
        })
        this.setState({ execution_output_list: output_list });
        let output_string = "";
        output_list.map(
          (element) => {
            if (element.isPrint()) {
              // todo 这里text对象的toString被覆写了，我找不到覆写方法的位置，导致text.value为array时最终输出为[object object] there text object's toString function be overwritten, please fix the bug
              output_string += element.text + '\n';
            }
          });
        this.setState({ execution_output_string: output_string, loading: false  })
      } else if (m.data.status === 'error') {
        this.setState({ execution_output_string: "Exception caught while executing the script:\n\n" + m.data.errorMsg, loading: false  });
      }
    };
  }

  componentWillUnmount() {
    myCompiledWorker.terminate()
    myOutputWorker.terminate()
  }

  handleCompileAndRun(event) {
    console.log('Hedgehog Lab: Start Compiling...');
    this.setState({ loading: true })
    myCompiledWorker.postMessage(this.state.source)

    //compile
    // let compiled_result = '';
    // try {
    //   compiled_result = transpile(this.state.source);
    // } catch (compileError) {
    //   this.setState({
    //     execution_output_string:
    //       'Exception caught by Babel compiler:\n\n' + compileError.toString(),
    //   });
    //   return;
    // }
    // console.log('The compiled code to be executed:\n' + compiled_result);
    // this.setState({ compiled_code: compiled_result });
    //
    // //run and get the result
    // let output_list = '';
    // try {
    //   output_list = executeOutput(compiled_result);
    // } catch (executionError) {
    //   this.setState({
    //     execution_output_string:
    //       'Exception caught while executing the script:\n\n' +
    //       executionError.toString(),
    //   });
    //   return;
    // }
    // this.setState({ execution_output_list: output_list });
    //
    // //get all OutputItem with type === "print" and save to "execution_result"
    // //to update the textbox
    // let output_string = '';
    // output_list.map((element) => {
    //   if (element.isPrint()) {
    //     console.log(element);
    //     output_string += element.text + '\n';
    //   }
    // });
    //
    // this.setState({ execution_output_string: output_string });
    event.preventDefault();
  }

  handleLoadTutorial(index, event) {
    this.setState({
      source: tutorials[index].source,
    });
  }

  render() {
    const options = {
      wordWrap: 'on',
      scrollBeyondLastLine: false,
    };
    return (
      <div>
        <div>
          <Container maxWidth="xl">
            <div style={{ flexGrow: 1 }}>
              <AppBar position="static" elevation={0} color="default">
                <Toolbar>
                  <Typography variant="h6" style={{ flexGrow: 1 }}>
                    Hedgehog Lab
                  </Typography>

                  <Button
                    color="inherit"
                    style={{ textTransform: 'none' }}
                    target="_black"
                    href="https://twitter.com/lidangzzz"
                  >
                    Twitter
                  </Button>
                  <Button
                    color="inherit"
                    style={{ textTransform: 'none' }}
                    target="_black"
                    href="https://github.com/lidangzzz/hedgehog-lab"
                  >
                    Github
                  </Button>
                </Toolbar>
              </AppBar>
            </div>

            <Box my={4}>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Card variant="outlined">
                    <CardHeader
                      action={
                        <div className="run-button">
                          <Button
                            variant="contained"
                            color="primary"
                            onClick={this.handleCompileAndRun}
                            style={{ textTransform: 'none' }}
                            disabled={this.state.loading}
                          >
                            Compile and run
                          </Button>
                          {this.state.loading && <CircularProgress size={24} class={'run-button-loading'}/>}
                        </div>
                      }
                      title="Your code:"
                    />

                    <CardContent>
                      <ControlledEditor
                        height="90vh"
                        language="javascript"
                        value={this.state.source}
                        onChange={(e, v) => {
                          this.setState({ source: v });
                        }}
                        options={options}
                      />
                    </CardContent>
                  </Card>

                  <Box my={2}>
                    <Typography variant="h6" gutterBottom>
                      Hedgehog Lab Tutorials:
                    </Typography>

                    {tutorials.map((tutorial, i) => {
                      return (
                        <Box my={1}>
                          <Button
                            size="small"
                            style={{ textTransform: 'none' }}
                            variant="contained"
                            disableElevation
                            onClick={(event) =>
                              this.handleLoadTutorial(i, event)
                            }
                          >
                            Tutorial {i + 1}: {tutorial.description}
                          </Button>
                        </Box>
                      );
                    })}
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>
                    Results:
                  </Typography>

                  <div>
                    <Output outputItemList={this.state.execution_output_list} />
                  </div>
                  <TextareaAutosize
                    value={this.state.execution_output_string}
                    style={{
                      //fontSize: 16,
                      fontFamily:
                        "'Fira code', 'Fira Mono', Consolas, Menlo, Courier, monospace",
                    }}
                    disabled
                  />
                </Grid>
              </Grid>

              <div>
                <Typography>
                  <Link
                    href="https://github.com/lidangzzz/hedgehog-lab"
                    variant="title"
                  >
                    {
                      'Fork this repository at Github: https://github.com/lidangzzz/hedgehog-lab"'
                    }
                  </Link>

                  <br />

                  <Link href="https://twitter.com/lidangzzz" variant="title">
                    {'Follow my Twitter: @lidangzzz'}
                  </Link>
                </Typography>
              </div>
            </Box>
          </Container>
        </div>
      </div>
    );
  }
}

export default HedgehogLab;
