import { useEffect, useState } from "react";
import styled from "styled-components";
import Countdown from "react-countdown";
import { Button, CircularProgress, Snackbar } from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

import {
  faTelegram,
  faFacebook,
  faTwitter,
  faInstagram
} from "@fortawesome/free-brands-svg-icons";

import * as anchor from "@project-serum/anchor";

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletDialogButton } from "@solana/wallet-adapter-material-ui";

import {
  CandyMachine,
  awaitTransactionSignatureConfirmation,
  getCandyMachineState,
  mintOneToken,
  shortenAddress,
} from "./candy-machine";

const ConnectButton = styled(WalletDialogButton)`
`;

const CounterText = styled.span``; // add your styles here

const MintContainer = styled.div``; // add your styles here

const MintButton = styled(Button)`
`; // add your styles here

export interface HomeProps {
  candyMachineId: anchor.web3.PublicKey;
  config: anchor.web3.PublicKey;
  connection: anchor.web3.Connection;
  startDate: number;
  treasury: anchor.web3.PublicKey;
  txTimeout: number;
}

const Home = (props: HomeProps) => {


  const [balance, setBalance] = useState<number>();
  const [isActive, setIsActive] = useState(false); // true when countdown completes
  const [isSoldOut, setIsSoldOut] = useState(false); // true when items remaining is zero
  const [isMinting, setIsMinting] = useState(false); // true when user got to press MINT

  const [itemsAvailable, setItemsAvailable] = useState(0);
  const [itemsRedeemed, setItemsRedeemed] = useState(0);
  const [itemsRemaining, setItemsRemaining] = useState(0);

  const [alertState, setAlertState] = useState<AlertState>({
    open: false,
    message: "",
    severity: undefined,
  });


  const [startDate, setStartDate] = useState(new Date(props.startDate));


  const wallet = useAnchorWallet();
  const [candyMachine, setCandyMachine] = useState<CandyMachine>();

  const onMint = async () => {
    try {
      setIsMinting(true);
      if (wallet && candyMachine?.program) {
        const mintTxId = await mintOneToken(
          candyMachine,
          props.config,
          wallet.publicKey,
          props.treasury
        );

        const status = await awaitTransactionSignatureConfirmation(
          mintTxId,
          props.txTimeout,
          props.connection,
          "singleGossip",
          false
        );

        if (!status?.err) {
          setAlertState({
            open: true,
            message: "Congratulations! Mint succeeded!",
            severity: "success",
          });
        } else {
          setAlertState({
            open: true,
            message: "Mint failed! Please try again!",
            severity: "error",
          });
        }
      }
    } catch (error: any) {
      // TODO: blech:
      console.log(error)
      let message = error.msg || "Minting failed! Please try again!";
      if (!error.msg) {
        if (error.message.indexOf("0x138")) {
        } else if (error.message.indexOf("0x137")) {
          message = `SOLD OUT!`;
        } else if (error.message.indexOf("0x135")) {
          message = `Insufficient funds to mint. Please fund your wallet.`;
        }
      } else {
        if (error.code === 311) {
          message = `SOLD OUT!`;
          setIsSoldOut(true);
        } else if (error.code === 312) {
          message = `Minting period hasn't started yet.`;
        }
      }

      setAlertState({
        open: true,
        message,
        severity: "error",
      });
    } finally {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
      setIsMinting(false);
    }
  };

  useEffect(() => {
    (async () => {
      if (wallet) {
        const balance = await props.connection.getBalance(wallet.publicKey);
        setBalance(balance / LAMPORTS_PER_SOL);
      }
    })();
  }, [wallet, props.connection]);

  useEffect(() => {
    (async () => {
      if (!wallet) return;

      const {
        candyMachine,
        goLiveDate,
        itemsAvailable,
        itemsRemaining,
        itemsRedeemed,
      } = await getCandyMachineState(
        wallet as anchor.Wallet,
        props.candyMachineId,
        props.connection
      );

      setItemsAvailable(itemsAvailable);
      setItemsRemaining(itemsRemaining);
      setItemsRedeemed(itemsRedeemed);

      setIsSoldOut(itemsRemaining === 0);
      setStartDate(goLiveDate);
      setCandyMachine(candyMachine);
    })();
  }, [wallet, props.candyMachineId, props.connection]);

  return (
    <main id="main">
      <nav className="navbar navbar-light fixed-top flex-md-nowrap">
        <div id="anav">
          <a
              className="navbar-brand col-sm-3 col-md-2 mr-0"
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              id="first-link"
          >
          <h2 id="first-title">Solkeys</h2>
          </a>

        </div>
        <div id='user-info'>
          <small id="balance">My Solkeys: {itemsRedeemed}</small>
          <small id="balance">Balance: {(balance || 0).toLocaleString()} SOL</small>
          {!wallet ? <ConnectButton style={
              {
                fontFamily: 'Kanit',
                borderRadius: '25px',
                fontSize: '18px'
              }
            }>Connect Wallet</ConnectButton> : <small id='account'>{wallet.publicKey.toBase58() || ""}</small>}
        </div>
      </nav>

      <div className="row2" id="first-row">
                    <div id="col-3" className="column">
                    <video width="320" height="300" loop autoPlay muted>
        <source src="monkey-slide.mp4" type="video/mp4"/>
        <source src="movie.ogg" type="video/ogg"/>
          Your browser does not support the video tag.
      </video>
                    </div>
                    <div id="col-4" className="column">


                    {<h1 style={{marginTop: "50px"}}>{itemsAvailable-itemsRemaining}/{itemsAvailable} Solkeys minted</h1>}
      {<h3 id="launch-text">Launch date: {wallet ? startDate.toUTCString() : <p></p>}</h3>}

      {<p>Price: 1 Solkey = 2 SOL</p>}

      <MintContainer>
          <MintButton
            disabled={isSoldOut || isMinting || !isActive || !wallet}
            onClick={onMint}
            variant="contained"
            style={
              {
                fontSize: "22px",
                fontFamily: 'Kanit',
                borderRadius: '20px',
              }
            }
          >
            {isSoldOut ? (
              "SOLD OUT"
            ) : isActive ? (
              isMinting ? (
                <CircularProgress />
              ) : (
                "MINT A SOLKEY"
              )
            ) : (
              <Countdown
                date={startDate}
                onMount={({ completed }) => completed && setIsActive(true)}
                onComplete={() => setIsActive(true)}
                renderer={renderCounter}
              />
            )}
          </MintButton>
      </MintContainer>

                      </div>
                </div>


      <div className="row2">
                    <div id="col-1" className="column">
                      <h1 id="info">About Solkeys</h1>
                      <p id="para">
                        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ipsum suspendisse ultrices gravida dictum fusce ut placerat orci nulla. Sodales ut eu sem integer vitae justo. Quam nulla porttitor massa id neque aliquam vestibulum morbi blandit. Dictum at tempor commodo ullamcorper a lacus.Aliquet eget sit amet tellus cras adipiscing enim eu turpis. Enim diam vulputate ut pharetra. Eu volutpat odio facilisis mauris sit amet. Porta nibh venenatis cras sed felis eget velit. Donec ultrices tincidunt arcu non sodales neque sodales. Et molestie ac feugiat sed lectus vestibulum mattis.
                      </p>
                    </div>
                    <div id="col-2" className="column"><img id="about-image" src="0107.jpg"></img></div>
                </div>


      <Snackbar
        open={alertState.open}
        autoHideDuration={6000}
        onClose={() => setAlertState({ ...alertState, open: false })}
      >
        <Alert
          onClose={() => setAlertState({ ...alertState, open: false })}
          severity={alertState.severity}
        >
          {alertState.message}
        </Alert>
      </Snackbar>
      <div className="social-container">
        <h3>Social Follow</h3>
        <a href="/"
          className="telegram social">
          <FontAwesomeIcon icon={faTelegram} size="2x" />
        </a>
        <a href="/"
          className="facebook social">
          <FontAwesomeIcon icon={faFacebook} size="2x" />
        </a>
        <a href="/" className="twitter social">
          <FontAwesomeIcon icon={faTwitter} size="2x" />
        </a>
        <a href="/"
          className="instagram social">
          <FontAwesomeIcon icon={faInstagram} size="2x" />
        </a>
      </div>
    </main>


  );
};

interface AlertState {
  open: boolean;
  message: string;
  severity: "success" | "info" | "warning" | "error" | undefined;
}

const renderCounter = ({ days, hours, minutes, seconds, completed }: any) => {
  return (
    <CounterText>
      {hours + (days || 0) * 24} hours, {minutes} minutes, {seconds} seconds
    </CounterText>
  );
};

export default Home;
