# Use an official Ubuntu as a parent image
FROM ubuntu:20.04

# Set environment variables to non-interactive to avoid prompts during installation
ENV DEBIAN_FRONTEND=noninteractive

# Update the package list and install necessary packages
RUN apt-get update && \
    apt-get install -y build-essential libssl-dev libgmp-dev wget unzip && \
    rm -rf /var/lib/apt/lists/*

# Download the keyhunt source code
RUN wget https://github.com/albertobsd/keyhunt/archive/refs/heads/main.zip

# Unzip the downloaded file and remove the zip file
RUN unzip main.zip && \
    rm main.zip

# Set the working directory to keyhunt-main
WORKDIR /keyhunt-main

# Build the keyhunt binary
RUN make

# Clear the terminal and run the keyhunt command
CMD clear && ./keyhunt -m rmd160 -f tests/66.rmd -r 2a000000000000000:3ffffffffffffffff -l compress -R -s 5 -t 4 -k factor
